import type { LlmProvider, ProviderInfo } from "@llm-logger/shared";

import type { Config } from "../config.js";

export function isProviderAvailable(config: Config, provider: LlmProvider): boolean {
  switch (provider) {
    case "gemini":
      return Boolean(config.GEMINI_API_KEY);
    case "openai":
      return Boolean(config.OPENAI_API_KEY);
    case "mock":
      return true;
    default:
      return false;
  }
}

export function listProviderOptions(config: Config): ProviderInfo[] {
  const all: ProviderInfo[] = [
    {
      id: "gemini",
      label: "Gemini",
      model: config.GEMINI_MODEL,
      available: isProviderAvailable(config, "gemini"),
    },
    {
      id: "openai",
      label: "OpenAI",
      model: config.OPENAI_MODEL,
      available: isProviderAvailable(config, "openai"),
    },
    {
      id: "mock",
      label: "Mock",
      model: "mock",
      available: true,
    },
  ];
  return all.filter((p) => p.available);
}

export function resolveProvider(config: Config, requested?: LlmProvider): LlmProvider {
  const provider = requested ?? config.LLM_PROVIDER;
  if (!isProviderAvailable(config, provider)) {
    throw new ProviderUnavailableError(provider);
  }
  return provider;
}

export function modelForProvider(config: Config, provider: LlmProvider): string {
  switch (provider) {
    case "gemini":
      return config.GEMINI_MODEL;
    case "openai":
      return config.OPENAI_MODEL;
    case "mock":
      return "mock";
    default:
      return config.GEMINI_MODEL;
  }
}

export function providerApiKey(config: Config, provider: LlmProvider): string | undefined {
  switch (provider) {
    case "gemini":
      return config.GEMINI_API_KEY;
    case "openai":
      return config.OPENAI_API_KEY;
    default:
      return undefined;
  }
}

export class ProviderUnavailableError extends Error {
  constructor(public readonly provider: LlmProvider) {
    super(`Provider "${provider}" is not configured on the server`);
    this.name = "ProviderUnavailableError";
  }
}
