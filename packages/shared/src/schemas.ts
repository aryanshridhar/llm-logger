import { z } from "zod";

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const inferenceStatusSchema = z.enum(["success", "error", "cancelled"]);
export type InferenceStatus = z.infer<typeof inferenceStatusSchema>;

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export const inferenceLogPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  userId: z.string().min(1).max(128),

  provider: z.string().min(1).max(32),
  model: z.string().min(1).max(64),

  status: inferenceStatusSchema,
  errorMessage: z.string().max(2000).optional(),

  latencyMs: z.number().int().nonnegative(),
  requestStartedAt: z.string().datetime(),
  requestCompletedAt: z.string().datetime(),

  usage: tokenUsageSchema.optional(),

  inputPreview: z.string().max(500).optional(),
  outputPreview: z.string().max(500).optional(),

  contextMessagesIncluded: z.number().int().nonnegative().optional(),
  contextStrategy: z.string().max(64).optional(),

  rawMetadata: z.record(z.unknown()).optional(),
});
export type InferenceLogPayload = z.infer<typeof inferenceLogPayloadSchema>;

export const llmProviderSchema = z.enum(["gemini", "openai", "mock"]);
export type LlmProvider = z.infer<typeof llmProviderSchema>;

export const providerInfoSchema = z.object({
  id: llmProviderSchema,
  label: z.string(),
  model: z.string(),
  available: z.boolean(),
});
export type ProviderInfo = z.infer<typeof providerInfoSchema>;

export const providersResponseSchema = z.object({
  defaultProvider: llmProviderSchema,
  providers: z.array(providerInfoSchema),
});
export type ProvidersResponse = z.infer<typeof providersResponseSchema>;

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  provider: llmProviderSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("conversation"),
    conversationId: z.string().uuid(),
    title: z.string(),
  }),
  z.object({
    type: z.literal("delta"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    messageId: z.string().uuid(),
    usage: tokenUsageSchema.optional(),
    latencyMs: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const statsRangeSchema = z.enum(["1h", "24h", "7d"]);
export type StatsRange = z.infer<typeof statsRangeSchema>;

export const statsSummarySchema = z.object({
  range: statsRangeSchema,
  totalRequests: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1).nullable(),
  errorCount: z.number().int().nonnegative(),
  cancelledCount: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  series: z.array(
    z.object({
      bucket: z.string().datetime(),
      requests: z.number().int().nonnegative(),
      avgLatencyMs: z.number().nonnegative(),
      errors: z.number().int().nonnegative(),
      tokens: z.number().int().nonnegative(),
    }),
  ),
  byModel: z.array(
    z.object({
      model: z.string(),
      requests: z.number().int().nonnegative(),
      avgLatencyMs: z.number().nonnegative(),
    }),
  ),
});
export type StatsSummary = z.infer<typeof statsSummarySchema>;

export const conversationListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
});
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof messageSchema>;
