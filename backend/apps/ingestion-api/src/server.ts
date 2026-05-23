import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import type { Config } from "./config.js";
import { registerLogsRoutes } from "./routes/logs.js";
import { SqsPublisher } from "./sqs.js";

export async function buildServer(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
    disableRequestLogging: false,
  });

  await app.register(cors, { origin: true });

  const publisher = new SqsPublisher(config);

  app.get("/health", async () => ({ status: "ok", service: "ingestion-api" }));

  await registerLogsRoutes(app, { publisher });

  return app;
}
