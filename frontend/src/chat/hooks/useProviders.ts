import type { LlmProvider, ProvidersResponse } from "@llm-logger/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../../common/utils/api";
import { loadStoredProvider, saveStoredProvider } from "../utils/providers";

export function useProviders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["providers"],
    queryFn: () => apiFetch<ProvidersResponse>("/api/providers"),
    staleTime: 60_000,
  });

  const [provider, setProviderState] = useState<LlmProvider | null>(() => loadStoredProvider());

  useEffect(() => {
    if (!data) return;
    const available = data.providers.map((p) => p.id);
    const stored = loadStoredProvider();
    const pick =
      stored && available.includes(stored)
        ? stored
        : available.includes(data.defaultProvider)
          ? data.defaultProvider
          : available[0];
    if (pick) {
      setProviderState(pick);
      saveStoredProvider(pick);
    }
  }, [data]);

  const setProvider = useCallback((next: LlmProvider) => {
    setProviderState(next);
    saveStoredProvider(next);
  }, []);

  const active = data?.providers.find((p) => p.id === provider);

  return {
    providers: data?.providers ?? [],
    defaultProvider: data?.defaultProvider,
    provider: provider ?? data?.defaultProvider,
    active,
    setProvider,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
