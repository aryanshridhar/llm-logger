import { deferChatCompletion } from "../deferred.js";
import type { ChatMessage, ChatOptions, ChatStream, LLMProvider } from "../types.js";

export class MockProvider implements LLMProvider {
  readonly name = "mock";

  constructor(private readonly options: { tokenDelayMs?: number } = {}) {}

  async chatStream(messages: ChatMessage[], _options: ChatOptions): Promise<ChatStream> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) throw new Error("MockProvider requires at least one user message");

    const reply = `Mock response to: "${lastUser.content}". This is a deterministic stub used when no real LLM key is configured. Set LLM_PROVIDER to gemini or openai and configure the matching API key.`;

    const words = reply.split(" ");
    const delay = this.options.tokenDelayMs ?? 25;
    let aggregated = "";
    const promptTokens = messages.reduce((n, m) => n + m.content.split(/\s+/).length, 0);
    const completionDeferred = deferChatCompletion();

    async function* deltas(): AsyncIterable<string> {
      try {
        for (const word of words) {
          await new Promise((r) => setTimeout(r, delay));
          const chunk = `${word} `;
          aggregated += chunk;
          yield chunk;
        }
        completionDeferred.resolve({
          text: aggregated || reply,
          usage: {
            promptTokens,
            completionTokens: words.length,
            totalTokens: promptTokens + words.length,
          },
          rawMetadata: { mock: true },
        });
      } catch (err) {
        completionDeferred.reject(err);
        throw err;
      }
    }

    return { deltas: deltas(), completion: completionDeferred.promise };
  }
}
