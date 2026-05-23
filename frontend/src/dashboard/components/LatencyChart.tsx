import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { StatsSummary } from "../types/types";
import { formatLatency, formatTimeShort } from "../utils/format";

interface Props {
  series: StatsSummary["series"];
}

export function LatencyChart({ series }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-sm backdrop-blur-sm">
      <div className="border-b border-neutral-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-neutral-100">Latency</h3>
        <p className="mt-0.5 text-xs text-neutral-400">Average ms per inference call over time</p>
      </div>
      <div className="h-64 px-5 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="bucket"
              tickFormatter={formatTimeShort}
              stroke="#525252"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatLatency(v)}
              stroke="#525252"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label: string) => formatTimeShort(label)}
              formatter={(v: number) => [formatLatency(v), "Avg latency"]}
            />
            <Area
              type="monotone"
              dataKey="avgLatencyMs"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#latencyFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
