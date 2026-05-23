import type { LlmProvider, ProviderInfo } from "@llm-logger/shared";

import { cn } from "../../common/utils/cn";

interface Props {
  providers: ProviderInfo[];
  value: LlmProvider | undefined;
  onChange: (provider: LlmProvider) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ProviderSelect({ providers, value, onChange, disabled, isLoading }: Props) {
  if (isLoading) {
    return (
      <span className="text-xs text-neutral-500" aria-live="polite">
        Loading models…
      </span>
    );
  }

  if (providers.length === 0) {
    return <span className="text-xs text-amber-400">No providers configured</span>;
  }

  const first = providers[0];
  if (!first) {
    return <span className="text-xs text-amber-400">No providers configured</span>;
  }

  if (providers.length === 1) {
    return (
      <span className="text-xs text-neutral-500" title={first.model}>
        {first.label} · {first.model}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500">
      <span className="sr-only">LLM provider</span>
      <select
        value={value ?? first.id}
        onChange={(e) => onChange(e.target.value as LlmProvider)}
        disabled={disabled}
        className={cn(
          "rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-200",
          "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} ({p.model})
          </option>
        ))}
      </select>
    </label>
  );
}
