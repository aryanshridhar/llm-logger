import { useState } from "react";

import { Spinner } from "../../common/components/Spinner";
import { useRecentLogs, useStats } from "../hooks/useStats";
import type { StatsRange } from "../types/types";
import { AvgLatencyStat } from "./AvgLatencyStat";
import { LatencyChart } from "./LatencyChart";
import { RangePicker } from "./RangePicker";
import { RecentLogsTable } from "./RecentLogsTable";
import { RequestsStat } from "./RequestsStat";
import { SuccessRateStat } from "./SuccessRateStat";
import { ThroughputChart } from "./ThroughputChart";
import { TotalTokensStat } from "./TotalTokensStat";

export function DashboardPage() {
  const [range, setRange] = useState<StatsRange>("24h");
  const stats = useStats(range);
  const logs = useRecentLogs(50);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">Dashboard</h1>
          <p className="text-xs text-neutral-500">Live inference telemetry. Refreshes every 10s.</p>
        </div>
        <div className="flex items-center gap-3">
          {(stats.isFetching || logs.isFetching) && (
            <span className="flex items-center gap-2 text-xs text-neutral-500">
              <Spinner /> updating
            </span>
          )}
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {stats.error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          Failed to load stats: {(stats.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RequestsStat totalRequests={stats.data?.totalRequests} />
        <SuccessRateStat
          successRate={stats.data?.successRate}
          errorCount={stats.data?.errorCount}
        />
        <AvgLatencyStat
          avgLatencyMs={stats.data?.avgLatencyMs}
          p95LatencyMs={stats.data?.p95LatencyMs}
        />
        <TotalTokensStat
          totalTokens={stats.data?.totalTokens}
          modelCount={stats.data?.byModel.length}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LatencyChart series={stats.data?.series ?? []} />
        <ThroughputChart series={stats.data?.series ?? []} />
      </div>

      <div className="mt-4">
        <RecentLogsTable rows={logs.data ?? []} />
      </div>
    </div>
  );
}
