import type { LlmProvider } from "@llm-logger/shared";

export const PROVIDER_STORAGE_KEY = "llm-logger:provider";

export function loadStoredProvider(): LlmProvider | null {
  const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (raw === "gemini" || raw === "openai" || raw === "mock") return raw;
  return null;
}

export function saveStoredProvider(provider: LlmProvider): void {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}
