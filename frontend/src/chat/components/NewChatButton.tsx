import { cn } from "../../common/utils/cn";

interface Props {
  disabled?: boolean;
  onClick: () => void;
}

export function NewChatButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 px-3 text-xs font-medium text-neutral-100",
        "transition-colors hover:bg-neutral-700",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      New chat
    </button>
  );
}
