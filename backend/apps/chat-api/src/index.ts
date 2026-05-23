import "dotenv/config";

import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const app = await buildServer(config);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Shutdown error");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({ host: "0.0.0.0", port: config.CHAT_API_PORT });
    app.log.info(`chat-api listening on :${config.CHAT_API_PORT}`);
  } catch (err) {
    app.log.error({ err }, "Failed to start");
    process.exit(1);
  }
}

void main();
