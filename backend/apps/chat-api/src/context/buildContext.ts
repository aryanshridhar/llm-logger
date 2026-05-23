import type { ChatMessage } from "@llm-logger/sdk";
import { CONTEXT_STRATEGY_SLIDING } from "@llm-logger/shared";

export interface HistoryMessage {
  role: string;
  content: string;
}

export interface BuildContextInput {
  history: HistoryMessage[];
  currentUserMessage: string;
  maxHistoryMessages: number;
}

export interface BuildContextResult {
  messages: ChatMessage[];
  includedHistoryCount: number;
  strategy: string;
}

export function buildContext(input: BuildContextInput): BuildContextResult {
  const { history, currentUserMessage, maxHistoryMessages } = input;

  const recent = history.slice(-maxHistoryMessages);
  const normalized: ChatMessage[] = recent
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  normalized.push({ role: "user", content: currentUserMessage });

  return {
    messages: normalized,
    includedHistoryCount: recent.length,
    strategy: CONTEXT_STRATEGY_SLIDING,
  };
}
