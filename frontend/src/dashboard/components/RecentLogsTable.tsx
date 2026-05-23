import { cn } from "../../common/utils/cn";
import type { InferenceLogRow } from "../types/types";
import { formatDateTime, formatLatency, truncate } from "../utils/format";

interface Props {
  rows: InferenceLogRow[];
}

const statusClasses: Record<InferenceLogRow["status"], string> = {
  success: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
  error: "bg-red-950/60 text-red-300 border-red-900/60",
  cancelled: "bg-amber-950/60 text-amber-300 border-amber-900/60",
};

export function RecentLogsTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-sm backdrop-blur-sm">
      <div className="border-b border-neutral-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-neutral-100">Recent inference logs</h3>
        <p className="mt-0.5 text-xs text-neutral-400">{rows.length} most recent calls</p>
      </div>
      <div className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/40 text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Latency</th>
                <th className="px-4 py-2 font-medium">Tokens</th>
                <th className="px-4 py-2 font-medium">Input</th>
                <th className="px-4 py-2 font-medium">Output</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No inference logs yet. Send a message in the Chat tab.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-900 align-top last:border-0 hover:bg-neutral-900/40"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-neutral-400">
                      {formatDateTime(row.receivedAt)}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-300">
                      <div className="font-mono">{row.model}</div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                        {row.provider}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                          statusClasses[row.status],
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums text-neutral-200">
                      {formatLatency(row.latencyMs)}
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums text-neutral-300">
                      {row.totalTokens ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-400">
                      {truncate(row.inputPreview ?? "", 80)}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-400">
                      {row.status === "error"
                        ? truncate(row.errorMessage ?? "(error)", 80)
                        : truncate(row.outputPreview ?? "", 80)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
