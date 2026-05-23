import {
  DeleteMessageBatchCommand,
  type Message,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { type Prisma, getPrisma } from "@llm-logger/db";
import { inferenceLogPayloadSchema } from "@llm-logger/shared";
import { pino } from "pino";

import type { Config } from "./config.js";

const logger = pino({
  name: "worker",
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
      : undefined,
});

export class Consumer {
  private readonly client: SQSClient;
  private readonly prisma = getPrisma();
  private running = false;

  constructor(private readonly config: Config) {
    this.client = new SQSClient({
      region: config.AWS_REGION,
      endpoint: config.SQS_ENDPOINT,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info(
      {
        queue: this.config.SQS_QUEUE_URL,
        batchSize: this.config.BATCH_SIZE,
        waitSeconds: this.config.WAIT_TIME_SECONDS,
      },
      "Worker started",
    );

    while (this.running) {
      try {
        await this.pollOnce();
      } catch (err) {
        logger.error({ err }, "Poll loop iteration failed; backing off 1s");
        await sleep(1000);
      }
    }

    logger.info("Worker stopped");
  }

  stop(): void {
    this.running = false;
  }

  private async pollOnce(): Promise<void> {
    const received = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.config.SQS_QUEUE_URL,
        MaxNumberOfMessages: this.config.BATCH_SIZE,
        WaitTimeSeconds: this.config.WAIT_TIME_SECONDS,
        VisibilityTimeout: 30,
      }),
    );

    const messages = received.Messages ?? [];

    console.log(messages);
    if (messages.length === 0) return;

    logger.debug({ count: messages.length }, "Received batch");

    const { toDelete, validRows } = this.parseBatch(messages);

    if (validRows.length > 0) {
      try {
        await this.prisma.inferenceLog.createMany({
          data: validRows.map((row) => toCreateManyInput(row)),
          skipDuplicates: true,
        });
        logger.info({ count: validRows.length }, "Inserted inference logs");
      } catch (err) {
        // Insert failed — do NOT delete from queue. SQS visibility timeout
        // will return these to the queue for retry.
        logger.error({ err, count: validRows.length }, "Batch insert failed, will retry");
        return;
      }
    }

    // Delete both successfully-inserted messages AND the schema-invalid ones
    // (they will never succeed; keeping them would poison the queue).
    if (toDelete.length > 0) {
      try {
        await this.client.send(
          new DeleteMessageBatchCommand({
            QueueUrl: this.config.SQS_QUEUE_URL,
            Entries: toDelete.map((m, i) => ({
              Id: `del-${i}`,
              ReceiptHandle: m.ReceiptHandle,
            })),
          }),
        );
      } catch (err) {
        logger.warn(
          { err },
          "Delete batch failed; messages will reappear after visibility timeout",
        );
      }
    }
  }

  private parseBatch(messages: Message[]): {
    toDelete: Message[];
    validRows: ReturnType<typeof inferenceLogPayloadSchema.parse>[];
  } {
    const toDelete: Message[] = [];
    const validRows: ReturnType<typeof inferenceLogPayloadSchema.parse>[] = [];

    for (const msg of messages) {
      if (!msg.Body || !msg.ReceiptHandle) continue;
      let body: unknown;
      try {
        body = JSON.parse(msg.Body);
      } catch {
        logger.warn({ id: msg.MessageId }, "Non-JSON payload; dropping");
        toDelete.push(msg);
        continue;
      }
      const parsed = inferenceLogPayloadSchema.safeParse(body);
      if (!parsed.success) {
        logger.warn(
          { id: msg.MessageId, issues: parsed.error.flatten() },
          "Invalid payload; dropping",
        );
        toDelete.push(msg);
        continue;
      }
      validRows.push(parsed.data);
      toDelete.push(msg);
    }

    return { toDelete, validRows };
  }
}

function toCreateManyInput(
  row: ReturnType<typeof inferenceLogPayloadSchema.parse>,
): Prisma.InferenceLogCreateManyInput {
  return {
    conversationId: row.conversationId,
    messageId: row.messageId ?? null,
    userId: row.userId,
    provider: row.provider,
    model: row.model,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    latencyMs: row.latencyMs,
    requestStartedAt: new Date(row.requestStartedAt),
    requestCompletedAt: new Date(row.requestCompletedAt),
    promptTokens: row.usage?.promptTokens ?? null,
    completionTokens: row.usage?.completionTokens ?? null,
    totalTokens: row.usage?.totalTokens ?? null,
    inputPreview: row.inputPreview ?? null,
    outputPreview: row.outputPreview ?? null,
    contextMessagesIncluded: row.contextMessagesIncluded ?? null,
    contextStrategy: row.contextStrategy ?? null,
    rawMetadata:
      row.rawMetadata === undefined ? undefined : (row.rawMetadata as Prisma.InputJsonValue),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
