import { randomUUID } from "node:crypto";

import { getPrisma } from "@llm-logger/db";
import { type ChatStreamEvent, SSE_CONTENT_TYPE, chatRequestSchema } from "@llm-logger/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { Config } from "../config.js";
import { buildContext } from "../context/buildContext.js";
import { getLLMClient } from "../lib/llm.js";
import {
  ProviderUnavailableError,
  listProviderOptions,
  modelForProvider,
  resolveProvider,
} from "../lib/providers.js";
import { pickUserId } from "../lib/userId.js";

interface RouteDeps {
  config: Config;
}

export async function registerChatRoutes(app: FastifyInstance, deps: RouteDeps): Promise<void> {
  const prisma = getPrisma();

  app.get("/api/providers", async () => ({
    defaultProvider: deps.config.LLM_PROVIDER,
    providers: listProviderOptions(deps.config),
  }));

  app.post("/api/chat", async (request, reply) => {
    const userId = pickUserId(request);
    if (!userId) {
      return reply.code(400).send({ error: "missing_user_id_header" });
    }

    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_request",
        details: parsed.error.flatten(),
      });
    }
    const { conversationId: maybeConvId, message, provider: requestedProvider } = parsed.data;

    let provider: ReturnType<typeof resolveProvider>;
    try {
      provider = resolveProvider(deps.config, requestedProvider);
    } catch (err) {
      if (err instanceof ProviderUnavailableError) {
        return reply.code(400).send({
          error: "provider_unavailable",
          message: err.message,
          provider: err.provider,
        });
      }
      throw err;
    }

    const llm = getLLMClient(deps.config, provider);
    const model = modelForProvider(deps.config, provider);

    let conversation = maybeConvId
      ? await prisma.conversation.findUnique({ where: { id: maybeConvId } })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          id: maybeConvId ?? randomUUID(),
          userId,
          title: deriveTitle(message),
        },
      });
    } else if (conversation.userId !== userId) {
      return reply.code(403).send({ error: "forbidden" });
    }

    // Persist the user message before the LLM call so a crashed stream still leaves it in the DB.
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    const userMessageId = randomUUID();
    await prisma.message.create({
      data: {
        id: userMessageId,
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const { messages, includedHistoryCount, strategy } = buildContext({
      history,
      currentUserMessage: message,
      maxHistoryMessages: deps.config.MAX_HISTORY_MESSAGES,
    });

    const assistantMessageId = randomUUID();

    const { deltas, finalize } = llm.chatStream({
      conversationId: conversation.id,
      userId,
      messages,
      messageId: assistantMessageId,
      contextMessagesIncluded: includedHistoryCount,
      contextStrategy: strategy,
      model,
    });

    openSseStream(request, reply);
    sendSseEvent(reply, {
      type: "conversation",
      conversationId: conversation.id,
      title: conversation.title,
    });

    let accumulated = "";
    try {
      for await (const delta of deltas) {
        accumulated += delta;
        sendSseEvent(reply, { type: "delta", text: delta });
      }
    } catch (err) {
      request.log.error({ err }, "LLM stream failed");
      const message = err instanceof Error ? err.message : "stream_failed";
      sendSseEvent(reply, { type: "error", message });
      sendSseEvent(reply, { type: "done", messageId: assistantMessageId, latencyMs: 0 });
      reply.raw.end();
      return;
    }

    const finalResult = await finalize();

    if (finalResult.status === "success" && accumulated.length > 0) {
      await prisma.message.create({
        data: {
          id: assistantMessageId,
          conversationId: conversation.id,
          role: "assistant",
          content: accumulated,
          tokens: finalResult.completionTokens ?? null,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    if (finalResult.status !== "success" && accumulated.length === 0) {
      sendSseEvent(reply, {
        type: "error",
        message: `Model returned no text (check ${provider} API key / quota).`,
      });
    }

    sendSseEvent(reply, {
      type: "done",
      messageId: assistantMessageId,
      usage: {
        promptTokens: finalResult.promptTokens,
        completionTokens: finalResult.completionTokens,
        totalTokens: finalResult.totalTokens,
      },
      latencyMs: finalResult.latencyMs,
    });
    reply.raw.end();
  });
}

function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "New conversation";
}

function openSseStream(request: FastifyRequest, reply: FastifyReply): void {
  reply.hijack();

  const origin = request.headers.origin;
  const headers: Record<string, string> = {
    "content-type": SSE_CONTENT_TYPE,
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "content-type, x-user-id";
    headers.vary = "Origin";
  }

  reply.raw.writeHead(200, headers);
  reply.raw.socket?.setNoDelay(true);
}

function sendSseEvent(reply: FastifyReply, event: ChatStreamEvent): void {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}
