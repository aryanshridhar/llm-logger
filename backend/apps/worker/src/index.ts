import "dotenv/config";

import { disconnectPrisma } from "@llm-logger/db";
import { pino } from "pino";

import { loadConfig } from "./config.js";
import { Consumer } from "./consumer.js";

const logger = pino({
  name: "worker-main",
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
      : undefined,
});

async function main() {
  const config = loadConfig();
  const consumer = new Consumer(config);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    consumer.stop();
    await disconnectPrisma();
    // Give the in-flight poll a beat to wrap up, then exit.
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await consumer.start();
}

void main();
