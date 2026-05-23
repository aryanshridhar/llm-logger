import { randomUUID } from "node:crypto";

import type { InferenceLogPayload, InferenceStatus } from "@llm-logger/shared";
import pino from "pino";

import { type DispatcherOptions, LogDispatcher } from "./dispatcher.js";
import { lazyAsyncSingleton } from "./lazy-singleton.js";
import { type ProviderConfig, createProvider } from "./providers/index.js";
import type { ChatFinal, ChatMessage, ChatOptions, LLMProvider } from "./types.js";

const logger = pino({ name: "llm-client", level: process.env.LOG_LEVEL ?? "info" });

export interface LLMClientConfig {
  provider: ProviderConfig;
  model: string;
  systemPrompt?: string;
  ingestionUrl: string;
  dispatcherOptions?: Partial<DispatcherOptions>;
}

export interface ChatStreamCallParams {
  conversationId: string;
  userId: string;
  messages: ChatMessage[];
  messageId?: string;
  contextMessagesIncluded?: number;
  contextStrategy?: string;
  model?: string;
  systemPrompt?: string;
}

export interface ChatStreamCallResult {
  deltas: AsyncIterable<string>;
  finalize: () => Promise<{
    text: string;
    status: InferenceStatus;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }>;
}

export class LLMClient {
  private readonly provider: LLMProvider;
  private readonly dispatcher: LogDispatcher;

  constructor(private readonly config: LLMClientConfig) {
    this.provider = createProvider(config.provider);
    this.dispatcher = new LogDispatcher({
      ingestionUrl: config.ingestionUrl,
      ...config.dispatcherOptions,
    });
  }

  chatStream(params: ChatStreamCallParams): ChatStreamCallResult {
    const messageId = params.messageId ?? randomUUID();
    const model = params.model ?? this.config.model;
    const systemPrompt = params.systemPrompt ?? this.config.systemPrompt;
    const startedAt = new Date();
    const startedAtMs = startedAt.getTime();

    const getProviderStream = lazyAsyncSingleton(() => {
      const chatOptions: ChatOptions = {
        model,
        systemPrompt,
      };
      return this.provider.chatStream(params.messages, chatOptions);
    });

    async function* deltaGenerator(): AsyncGenerator<string> {
      const stream = await getProviderStream();
      for await (const delta of stream.deltas) {
        yield delta;
      }
    }

    const deltas = deltaGenerator();

    const finalize = async () => {
      const stream = await getProviderStream();
      let streamCompletion: ChatFinal;
      let status: InferenceStatus = "success";
      let errorMessage: string | undefined;
      try {
        streamCompletion = await stream.completion;
      } catch (err) {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        streamCompletion = { text: "", usage: undefined, rawMetadata: undefined };
      }

      const completedAt = new Date();
      const latencyMs = completedAt.getTime() - startedAtMs;

      const lastUser = [...params.messages].reverse().find((m) => m.role === "user");

      const payload: InferenceLogPayload = {
        conversationId: params.conversationId,
        messageId,
        userId: params.userId,
        provider: this.provider.name,
        model,
        status,
        errorMessage,
        latencyMs,
        requestStartedAt: startedAt.toISOString(),
        requestCompletedAt: completedAt.toISOString(),
        usage: streamCompletion.usage,
        inputPreview: lastUser?.content.slice(0, 500),
        outputPreview: streamCompletion.text.slice(0, 500),
        contextMessagesIncluded: params.contextMessagesIncluded,
        contextStrategy: params.contextStrategy,
        rawMetadata: streamCompletion.rawMetadata,
      };

      try {
        this.dispatcher.send(payload);
      } catch (err) {
        logger.warn({ err }, "Dispatcher send failed (swallowed)");
      }

      return {
        text: streamCompletion.text,
        status,
        latencyMs,
        promptTokens: streamCompletion.usage?.promptTokens,
        completionTokens: streamCompletion.usage?.completionTokens,
        totalTokens: streamCompletion.usage?.totalTokens,
      };
    };

    return { deltas, finalize };
  }

  get providerName(): string {
    return this.provider.name;
  }
}
