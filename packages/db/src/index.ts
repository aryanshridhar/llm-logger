import { PrismaClient } from "@prisma/client";

export type { Conversation, Message, InferenceLog, Prisma } from "@prisma/client";
export { PrismaClient } from "@prisma/client";

let _client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      log: process.env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
    });
  }
  return _client;
}

export async function disconnectPrisma(): Promise<void> {
  if (_client) {
    await _client.$disconnect();
    _client = null;
  }
}
