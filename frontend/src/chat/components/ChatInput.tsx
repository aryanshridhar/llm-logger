import { type FormEvent, type KeyboardEvent, useState } from "react";

import { Spinner } from "../../common/components/Spinner";
import { cn } from "../../common/utils/cn";

interface Props {
  disabled?: boolean;
  isStreaming?: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, isStreaming, onSend }: Props) {
  const [value, setValue] = useState("");

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || disabled || isStreaming) return;
    onSend(value);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const sendDisabled = disabled || isStreaming || !value.trim();

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        rows={1}
        value={value}
        placeholder="Send a message…  (Shift+Enter for newline)"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled || isStreaming}
        // biome-ignore lint/a11y/noAutofocus: chat input should focus on page load
        autoFocus
        className={cn(
          "w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100",
          "placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          "scrollbar-thin",
        )}
      />
      <button
        type="submit"
        disabled={sendDisabled}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm",
          "transition-colors hover:bg-brand-500",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {isStreaming ? (
          <>
            <Spinner />…
          </>
        ) : (
          "Send"
        )}
      </button>
    </form>
  );
}
