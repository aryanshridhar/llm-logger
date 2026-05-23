export type StatsRange = "1h" | "24h" | "7d";

export interface StatsSummary {
  range: StatsRange;
  totalRequests: number;
  successRate: number | null;
  errorCount: number;
  cancelledCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number;
  series: Array<{
    bucket: string;
    requests: number;
    avgLatencyMs: number;
    errors: number;
    tokens: number;
  }>;
  byModel: Array<{
    model: string;
    requests: number;
    avgLatencyMs: number;
  }>;
}

export interface InferenceLogRow {
  id: string;
  conversationId: string;
  provider: string;
  model: string;
  status: "success" | "error" | "cancelled";
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  inputPreview: string | null;
  outputPreview: string | null;
  errorMessage: string | null;
  receivedAt: string;
}
