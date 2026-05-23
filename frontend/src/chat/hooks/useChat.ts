import type { LlmProvider } from "@llm-logger/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiFetch } from "../../common/utils/api";
import type { ChatMessageItem } from "../types/types";
import { useChatStream } from "./useChatStream";
import { conversationsQueryKey } from "./useConversations";

interface ServerMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export function useChat(provider: LlmProvider | undefined) {
  const { conversationId: routeId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send, isStreaming } = useChatStream();

  function refreshConversationList() {
    void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
  }

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(routeId);
  const [error, setError] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    setConversationId(routeId);
    if (!routeId) {
      setMessages([]);
      setError(null);
    }
  }, [routeId]);

  useEffect(() => {
    if (!routeId) return;
    // Mid-stream navigate would otherwise refetch and replace optimistic messages.
    if (streamingIdRef.current) return;
    let cancelled = false;
    setError(null);
    apiFetch<ServerMessage[]>(`/api/conversations/${routeId}/messages`)
      .then((rows) => {
        if (cancelled) return;
        setMessages(
          rows.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  function appendOptimistic(
    role: ChatMessageItem["role"],
    content: string,
    pending = false,
  ): string {
    const id = `tmp-${crypto.randomUUID()}`;
    setMessages((prev) => [
      ...prev,
      { id, role, content, pending, createdAt: new Date().toISOString() },
    ]);
    return id;
  }

  function patchMessage(id: string, patch: Partial<ChatMessageItem>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (!provider) {
      setError("No LLM provider available — check server API keys.");
      return;
    }
    setError(null);

    appendOptimistic("user", trimmed);
    const assistantTmpId = appendOptimistic("assistant", "", true);
    streamingIdRef.current = assistantTmpId;

    await send(
      { conversationId, message: trimmed, provider },
      {
        onConversation: (id) => {
          if (!conversationId) {
            setConversationId(id);
            navigate(`/chat/${id}`, { replace: true });
          }
          refreshConversationList();
        },
        onDelta: (_delta, accumulated) => {
          if (streamingIdRef.current) {
            patchMessage(streamingIdRef.current, {
              content: accumulated,
              pending: accumulated.length === 0,
            });
          }
        },
        onDone: ({ messageId }) => {
          if (streamingIdRef.current) {
            patchMessage(streamingIdRef.current, { id: messageId, pending: false });
          }
          streamingIdRef.current = null;
          refreshConversationList();
        },
        onError: (msg) => {
          setError(msg);
          if (streamingIdRef.current) {
            patchMessage(streamingIdRef.current, {
              content: msg || "(no response)",
              pending: false,
            });
          }
          streamingIdRef.current = null;
        },
      },
    );
  }

  function startNew() {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
    navigate("/", { replace: true });
  }

  return {
    messages,
    conversationId,
    isStreaming,
    error,
    sendMessage,
    startNew,
  };
}
