export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  content: string;
  createdAt?: string;
  pending?: boolean;
}
