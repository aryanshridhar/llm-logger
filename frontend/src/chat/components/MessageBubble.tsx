import { cn } from "../../common/utils/cn";
import type { ChatMessageItem } from "../types/types";

interface Props {
  message: ChatMessageItem;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-brand-600 text-white rounded-br-sm"
            : "bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-sm",
        )}
      >
        {message.content || (message.pending ? <PendingDots /> : null)}
      </div>
    </div>
  );
}

function PendingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="assistant is thinking">
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-neutral-500"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-neutral-500"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-neutral-500"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}
