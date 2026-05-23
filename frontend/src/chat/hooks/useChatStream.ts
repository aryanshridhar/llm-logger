import type { LlmProvider } from "@llm-logger/shared";
import { useCallback, useState } from "react";

import { CHAT_API_URL } from "../../common/utils/env";
import { getUserId } from "../../common/utils/userId";

export type ChatStreamFrame =
  | { type: "conversation"; conversationId: string; title: string }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; usage?: TokenUsage; latencyMs: number }
  | { type: "error"; message: string };

interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface StreamHandlers {
  onConversation?: (conversationId: string, title: string) => void;
  onDelta?: (delta: string, accumulated: string) => void;
  onDone?: (info: { messageId: string; usage?: TokenUsage; latencyMs: number }) => void;
  onError?: (message: string) => void;
}

function parseSseFrame(rawFrame: string, handlers: StreamHandlers, accumulated: string): string {
  const dataLine = rawFrame.split("\n").find((line) => line.startsWith("data:"));
  if (!dataLine) return accumulated;

  const json = dataLine.slice("data:".length).trim();
  if (!json) return accumulated;

  try {
    const frame = JSON.parse(json) as ChatStreamFrame;
    if (frame.type === "conversation") {
      handlers.onConversation?.(frame.conversationId, frame.title);
    } else if (frame.type === "delta") {
      const next = accumulated + frame.text;
      handlers.onDelta?.(frame.text, next);
      return next;
    } else if (frame.type === "done") {
      handlers.onDone?.({
        messageId: frame.messageId,
        usage: frame.usage,
        latencyMs: frame.latencyMs,
      });
    } else if (frame.type === "error") {
      handlers.onError?.(frame.message);
    }
  } catch {
    // ignore malformed frame
  }
  return accumulated;
}

function normalizeSseChunk(chunk: string): string {
  return chunk.replace(/\r\n/g, "\n");
}

function consumeSseBuffer(
  buffer: string,
  handlers: StreamHandlers,
  accumulated: string,
): { accumulated: string; rest: string } {
  let acc = accumulated;
  let rest = normalizeSseChunk(buffer);
  let sep = rest.indexOf("\n\n");
  while (sep !== -1) {
    const frame = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    acc = parseSseFrame(frame, handlers, acc);
    sep = rest.indexOf("\n\n");
  }
  return { accumulated: acc, rest };
}

export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(
    async (
      body: { conversationId?: string; message: string; provider?: LlmProvider },
      handlers: StreamHandlers,
    ): Promise<void> => {
      setIsStreaming(true);
      let accumulated = "";

      try {
        const res = await fetch(`${CHAT_API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-user-id": getUserId(),
          },
          body: JSON.stringify(body),
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let message = text || `HTTP ${res.status}`;
          try {
            const parsed = JSON.parse(text) as { error?: string; message?: string };
            message = parsed.message ?? parsed.error ?? message;
          } catch {
            // not JSON
          }
          handlers.onError?.(message);
          return;
        }

        if (!contentType.includes("text/event-stream") || !res.body) {
          const text = await res.text().catch(() => "");
          handlers.onError?.(
            text || "Expected text/event-stream from /api/chat — is chat-api running on :3001?",
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += normalizeSseChunk(decoder.decode(value, { stream: true }));
          const consumed = consumeSseBuffer(buffer, handlers, accumulated);
          accumulated = consumed.accumulated;
          buffer = consumed.rest;
        }

        buffer += decoder.decode();
        const tail = consumeSseBuffer(buffer, handlers, accumulated);
        accumulated = tail.accumulated;
        if (tail.rest.trim()) {
          parseSseFrame(tail.rest, handlers, accumulated);
        }
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err.message : "stream_failed");
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  return { send, isStreaming };
}
