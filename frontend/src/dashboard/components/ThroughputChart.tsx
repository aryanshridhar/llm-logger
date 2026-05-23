import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { StatsSummary } from "../types/types";
import { formatNumber, formatTimeShort } from "../utils/format";

interface Props {
  series: StatsSummary["series"];
}

export function ThroughputChart({ series }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-sm backdrop-blur-sm">
      <div className="border-b border-neutral-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-neutral-100">Throughput</h3>
        <p className="mt-0.5 text-xs text-neutral-400">
          Inference calls per bucket; red bars indicate errors
        </p>
      </div>
      <div className="h-64 px-5 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
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
              tickFormatter={(v: number) => formatNumber(v)}
              stroke="#525252"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label: string) => formatTimeShort(label)}
            />
            <Bar dataKey="requests" stackId="a" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="errors" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
