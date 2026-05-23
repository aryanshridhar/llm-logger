import type { ConversationListItem } from "@llm-logger/shared";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../../common/utils/api";

export const conversationsQueryKey = ["conversations"] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: () => apiFetch<ConversationListItem[]>("/api/conversations"),
    staleTime: 30_000,
  });
}
