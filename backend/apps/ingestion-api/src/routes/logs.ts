import { inferenceLogPayloadSchema } from "@llm-logger/shared";
import type { FastifyInstance } from "fastify";

import type { SqsPublisher } from "../sqs.js";

interface RouteDeps {
  publisher: SqsPublisher;
}

export async function registerLogsRoutes(app: FastifyInstance, deps: RouteDeps): Promise<void> {
  app.post("/api/logs", async (request, reply) => {
    const parsed = inferenceLogPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn({ issues: parsed.error.flatten() }, "Invalid log payload");
      return reply.code(400).send({
        error: "invalid_payload",
        details: parsed.error.flatten(),
      });
    }

    try {
      const { messageId } = await deps.publisher.publish(parsed.data);
      return reply.code(202).send({ enqueued: true, messageId });
    } catch (err) {
      request.log.error({ err }, "SQS publish failed");
      return reply.code(500).send({ error: "enqueue_failed" });
    }
  });
}
