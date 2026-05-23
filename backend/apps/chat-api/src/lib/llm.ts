import { LLMClient } from "@llm-logger/sdk";
import type { LlmProvider } from "@llm-logger/shared";

import type { Config } from "../config.js";
import { isProviderAvailable, modelForProvider, providerApiKey } from "./providers.js";

const clients = new Map<LlmProvider, LLMClient>();

export function getLLMClient(config: Config, provider: LlmProvider): LLMClient {
  let client = clients.get(provider);
  if (client) return client;

  client = new LLMClient({
    provider: {
      name: provider,
      apiKey: providerApiKey(config, provider),
    },
    model: modelForProvider(config, provider),
    systemPrompt: config.SYSTEM_PROMPT,
    ingestionUrl: config.INGESTION_API_URL,
  });
  clients.set(provider, client);
  return client;
}

export function warmLLMClients(config: Config): void {
  for (const provider of ["gemini", "openai", "mock"] as const) {
    if (isProviderAvailable(config, provider)) {
      getLLMClient(config, provider);
    }
  }
}
