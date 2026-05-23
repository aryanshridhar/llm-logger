import { getPrisma } from "@llm-logger/db";
import type { FastifyInstance } from "fastify";

import { pickUserId } from "../lib/userId.js";

export async function registerConversationsRoutes(app: FastifyInstance): Promise<void> {
  const prisma = getPrisma();

  app.get("/api/conversations", async (request, reply) => {
    const userId = pickUserId(request);
    if (!userId) return reply.code(400).send({ error: "missing_user_id_header" });

    const rows = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    }));
  });

  app.get<{ Params: { id: string } }>("/api/conversations/:id/messages", async (request, reply) => {
    const userId = pickUserId(request);
    if (!userId) return reply.code(400).send({ error: "missing_user_id_header" });

    const convo = await prisma.conversation.findUnique({
      where: { id: request.params.id },
      select: { userId: true },
    });
    if (!convo) return reply.code(404).send({ error: "not_found" });
    if (convo.userId !== userId) return reply.code(403).send({ error: "forbidden" });

    const messages = await prisma.message.findMany({
      where: { conversationId: request.params.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  });
}
