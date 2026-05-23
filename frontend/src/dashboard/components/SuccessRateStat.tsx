import { cn } from "../../common/utils/cn";
import { formatPercent } from "../utils/format";

interface Props {
  successRate: number | null | undefined;
  errorCount: number | undefined;
}

export function SuccessRateStat({ successRate, errorCount }: Props) {
  const tone =
    successRate == null
      ? "neutral"
      : successRate < 0.95
        ? successRate < 0.8
          ? "danger"
          : "warning"
        : "success";

  const toneClasses = {
    neutral: "text-neutral-100",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  } as const;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        Success rate
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClasses[tone])}>
        {successRate != null ? formatPercent(successRate, 1) : "—"}
      </div>
      {errorCount !== undefined && (
        <div className="mt-1 text-xs text-neutral-500">{errorCount} errors</div>
      )}
    </div>
  );
}
