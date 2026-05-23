import { useEffect, useRef } from "react";

import type { ChatMessageItem } from "../types/types";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessageItem[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages.at(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages and streaming deltas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessage?.id, lastMessage?.content]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4 px-2">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
