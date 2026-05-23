import type { LLMProvider } from "../types.js";
import { GeminiProvider } from "./gemini.js";
import { MockProvider } from "./mock.js";
import { OpenAIProvider } from "./openai.js";

export { GeminiProvider } from "./gemini.js";
export { MockProvider } from "./mock.js";
export { OpenAIProvider } from "./openai.js";

export type ProviderName = "gemini" | "mock" | "openai";

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.name) {
    case "gemini":
      return new GeminiProvider(config.apiKey ?? "");
    case "openai":
      return new OpenAIProvider(config.apiKey ?? "");
    case "mock":
      return new MockProvider();
    default: {
      const _exhaustive: never = config.name;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
