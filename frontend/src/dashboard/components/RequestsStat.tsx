import { formatNumber } from "../utils/format";

interface Props {
  totalRequests: number | undefined;
}

export function RequestsStat({ totalRequests }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        Requests
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-100">
        {totalRequests !== undefined ? formatNumber(totalRequests) : "—"}
      </div>
    </div>
  );
}
