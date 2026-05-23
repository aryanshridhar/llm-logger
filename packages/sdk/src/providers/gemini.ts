import { type Content, GoogleGenAI } from "@google/genai";

import { deferChatCompletion } from "../deferred.js";
import type { ChatMessage, ChatOptions, ChatStream, LLMProvider } from "../types.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GeminiProvider requires a non-empty API key (set GEMINI_API_KEY)");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chatStream(messages: ChatMessage[], options: ChatOptions): Promise<ChatStream> {
    const inlineSystem = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const systemInstruction =
      [options.systemPrompt, inlineSystem].filter(Boolean).join("\n\n") || undefined;

    const contents: Content[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const last = contents[contents.length - 1];
    if (!last || last.role !== "user") {
      throw new Error("Last message must be a user message");
    }

    const stream = await this.ai.models.generateContentStream({
      model: options.model,
      contents,
      config: {
        systemInstruction,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
      },
    });

    let aggregated = "";
    let lastChunk: Awaited<ReturnType<typeof stream.next>>["value"] | undefined;
    const completionDeferred = deferChatCompletion();

    async function* deltas(): AsyncIterable<string> {
      try {
        for await (const chunk of stream) {
          lastChunk = chunk;
          const text = chunk.text;
          if (text) {
            aggregated += text;
            yield text;
          }
        }
        const usageMeta = lastChunk?.usageMetadata;
        completionDeferred.resolve({
          text: aggregated || lastChunk?.text || "",
          usage: usageMeta
            ? {
                promptTokens: usageMeta.promptTokenCount,
                completionTokens: usageMeta.candidatesTokenCount,
                totalTokens: usageMeta.totalTokenCount,
              }
            : undefined,
          rawMetadata: {
            modelVersion: lastChunk?.modelVersion,
            responseId: lastChunk?.responseId,
            finishReason: lastChunk?.candidates?.[0]?.finishReason,
          },
        });
      } catch (err) {
        completionDeferred.reject(err);
        throw err;
      }
    }

    return { deltas: deltas(), completion: completionDeferred.promise };
  }
}
