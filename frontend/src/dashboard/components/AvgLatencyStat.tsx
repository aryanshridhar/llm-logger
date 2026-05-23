import { formatLatency } from "../utils/format";

interface Props {
  avgLatencyMs: number | undefined;
  p95LatencyMs: number | undefined;
}

export function AvgLatencyStat({ avgLatencyMs, p95LatencyMs }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        Avg latency
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-100">
        {avgLatencyMs !== undefined ? formatLatency(avgLatencyMs) : "—"}
      </div>
      {p95LatencyMs !== undefined && (
        <div className="mt-1 text-xs text-neutral-500">p95 {formatLatency(p95LatencyMs)}</div>
      )}
    </div>
  );
}
