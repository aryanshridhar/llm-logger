import { Outlet } from "react-router-dom";

import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useProviders } from "../hooks/useProviders";
import { ChatInput } from "./ChatInput";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageList } from "./MessageList";
import { NewChatButton } from "./NewChatButton";
import { ProviderSelect } from "./ProviderSelect";

export function ChatPage() {
  const conversations = useConversations();
  const {
    providers,
    provider,
    active,
    setProvider,
    isLoading: providersLoading,
    error: providersError,
  } = useProviders();
  const { messages, isStreaming, error, sendMessage, startNew, conversationId } = useChat(provider);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0">
      <ConversationSidebar
        conversations={conversations.data}
        isLoading={conversations.isLoading}
        error={conversations.error instanceof Error ? conversations.error.message : null}
      />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="flex items-center justify-between pb-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-neutral-100">Chat</h1>
            <p className="text-xs text-neutral-500">
              {active ? `${active.label} · ${active.model}` : "New conversation"}
              {conversationId ? ` · ${conversationId.slice(0, 8)}…` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProviderSelect
              providers={providers}
              value={provider}
              onChange={setProvider}
              disabled={isStreaming}
              isLoading={providersLoading}
            />
            <NewChatButton onClick={startNew} disabled={isStreaming} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4 scrollbar-thin">
          <MessageList messages={messages} />
        </div>

        {(providersError || error) && (
          <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {providersError ?? error}
          </div>
        )}

        <div className="border-t border-neutral-800 pt-4">
          <ChatInput isStreaming={isStreaming} onSend={sendMessage} />
          <p className="mt-2 text-center text-[10px] text-neutral-600">
            Every message generates an inference log (latency, tokens, status) visible on the
            dashboard.
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
