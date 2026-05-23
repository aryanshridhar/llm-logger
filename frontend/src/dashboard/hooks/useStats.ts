import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../../common/utils/api";
import { getUserId } from "../../common/utils/userId";
import type { InferenceLogRow, StatsRange, StatsSummary } from "../types/types";

export function useStats(range: StatsRange) {
  const userId = getUserId();
  return useQuery({
    queryKey: ["stats", userId, range],
    queryFn: () => apiFetch<StatsSummary>(`/api/stats?range=${range}`),
    refetchInterval: 10_000,
  });
}

export function useRecentLogs(limit = 50) {
  const userId = getUserId();
  return useQuery({
    queryKey: ["logs", userId, limit],
    queryFn: () => apiFetch<InferenceLogRow[]>(`/api/logs?limit=${limit}`),
    refetchInterval: 10_000,
  });
}
