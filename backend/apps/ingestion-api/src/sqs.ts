import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import type { Config } from "./config.js";

export class SqsPublisher {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(config: Config) {
    this.queueUrl = config.SQS_QUEUE_URL;
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

  async publish(payload: unknown): Promise<{ messageId: string | undefined }> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(payload),
    });
    const result = await this.client.send(command);
    return { messageId: result.MessageId };
  }
}
