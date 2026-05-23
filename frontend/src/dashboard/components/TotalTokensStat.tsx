import { formatNumber } from "../utils/format";

interface Props {
  totalTokens: number | undefined;
  modelCount: number | undefined;
}

export function TotalTokensStat({ totalTokens, modelCount }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        Total tokens
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-100">
        {totalTokens !== undefined ? formatNumber(totalTokens) : "—"}
      </div>
      {modelCount !== undefined && (
        <div className="mt-1 text-xs text-neutral-500">Across {modelCount} model(s)</div>
      )}
    </div>
  );
}
