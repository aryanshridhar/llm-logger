import type { MessageRole, TokenUsage } from "@llm-logger/shared";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ChatStream {
  deltas: AsyncIterable<string>;
  completion: Promise<ChatFinal>;
}

export interface ChatFinal {
  text: string;
  usage?: TokenUsage;
  rawMetadata?: Record<string, unknown>;
}

export interface LLMProvider {
  readonly name: string;
  chatStream(messages: ChatMessage[], options: ChatOptions): Promise<ChatStream>;
}
