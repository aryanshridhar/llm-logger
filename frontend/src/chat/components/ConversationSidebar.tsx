import type { ConversationListItem } from "@llm-logger/shared";
import { NavLink } from "react-router-dom";

import { Spinner } from "../../common/components/Spinner";
import { cn } from "../../common/utils/cn";
import { formatDateTime } from "../../dashboard/utils/format";

interface Props {
  conversations: ConversationListItem[] | undefined;
  isLoading: boolean;
  error: string | null;
}

export function ConversationSidebar({ conversations, isLoading, error }: Props) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950/90">
      <div className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-100">Conversations</h2>
        <p className="mt-0.5 text-[11px] text-neutral-500">Resume a previous chat</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-neutral-500">
            <Spinner />
            Loading…
          </div>
        )}

        {error && <p className="px-4 py-6 text-xs text-red-300">{error}</p>}

        {!isLoading && !error && conversations?.length === 0 && (
          <p className="px-4 py-6 text-xs text-neutral-500">
            No conversations yet. Send a message to start one.
          </p>
        )}

        {!isLoading && !error && conversations && conversations.length > 0 && (
          <ul className="py-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <ConversationRow conversation={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationListItem }) {
  return (
    <NavLink
      to={`/chat/${conversation.id}`}
      className={({ isActive }) =>
        cn(
          "mx-2 block rounded-lg px-3 py-2.5 transition-colors",
          isActive
            ? "bg-neutral-800 text-neutral-100"
            : "text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100",
        )
      }
    >
      <div className="truncate text-sm font-medium">{conversation.title}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
        <span>{formatDateTime(conversation.updatedAt)}</span>
        <span className="shrink-0 tabular-nums">
          {conversation.messageCount} msg{conversation.messageCount === 1 ? "" : "s"}
        </span>
      </div>
    </NavLink>
  );
}
