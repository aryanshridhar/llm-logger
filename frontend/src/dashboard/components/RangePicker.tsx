import { cn } from "../../common/utils/cn";
import type { StatsRange } from "../types/types";

interface Props {
  value: StatsRange;
  onChange: (value: StatsRange) => void;
}

const OPTIONS: { id: StatsRange; label: string }[] = [
  { id: "1h", label: "Last hour" },
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
];

export function RangePicker({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900/60 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === opt.id
              ? "bg-neutral-700 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
