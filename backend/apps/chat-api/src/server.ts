import cors from "@fastify/cors";
import { disconnectPrisma } from "@llm-logger/db";
import Fastify, { type FastifyInstance } from "fastify";

import type { Config } from "./config.js";
import { warmLLMClients } from "./lib/llm.js";
import { listProviderOptions } from "./lib/providers.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerConversationsRoutes } from "./routes/conversations.js";
import { registerStatsRoutes } from "./routes/stats.js";

export async function buildServer(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
  });

  const corsOrigin =
    config.CORS_ORIGIN === "*"
      ? true
      : config.CORS_ORIGIN.split(",")
          .map((o) => o.trim())
          .filter(Boolean);

  await app.register(cors, {
    origin: corsOrigin,
    credentials: false,
    allowedHeaders: ["content-type", "x-user-id"],
    methods: ["GET", "POST", "OPTIONS"],
    exposedHeaders: ["x-conversation-id"],
  });

  app.get("/health", async () => {
    const providers = listProviderOptions(config);
    const active = providers.find((p) => p.id === config.LLM_PROVIDER) ?? providers[0];
    return {
      status: "ok",
      service: "chat-api",
      defaultProvider: config.LLM_PROVIDER,
      provider: active?.id ?? config.LLM_PROVIDER,
      model: active?.model,
      providers: providers.map((p) => p.id),
    };
  });

  await registerChatRoutes(app, { config });
  await registerConversationsRoutes(app);
  await registerStatsRoutes(app);

  // Warm the LLM client at boot so the first chat request doesn't pay the
  // construction cost (provider SDK import, etc.).
  warmLLMClients(config);

  app.addHook("onClose", async () => {
    await disconnectPrisma();
  });

  return app;
}
