import type { TokenUsage } from "@llm-logger/shared";
import OpenAI from "openai";

import { deferChatCompletion } from "../deferred.js";
import type { ChatMessage, ChatOptions, ChatStream, LLMProvider } from "../types.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAIProvider requires a non-empty API key (set OPENAI_API_KEY)");
    }
    this.client = new OpenAI({ apiKey });
  }

  async chatStream(messages: ChatMessage[], options: ChatOptions): Promise<ChatStream> {
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      openaiMessages.push({ role: "system", content: options.systemPrompt });
    }

    for (const m of messages) {
      if (m.role === "system") {
        openaiMessages.push({ role: "system", content: m.content });
      } else {
        openaiMessages.push({ role: m.role, content: m.content });
      }
    }

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    let aggregated = "";
    let usage: TokenUsage | undefined;
    const completionDeferred = deferChatCompletion();

    async function* deltas(): AsyncIterable<string> {
      try {
        for await (const chunk of stream) {
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
          }

          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            aggregated += text;
            yield text;
          }
        }
        completionDeferred.resolve({
          text: aggregated,
          usage,
          rawMetadata: { provider: "openai", model: options.model },
        });
      } catch (err) {
        completionDeferred.reject(err);
        throw err;
      }
    }

    return { deltas: deltas(), completion: completionDeferred.promise };
  }
}
