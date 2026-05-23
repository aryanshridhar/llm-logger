import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  CHAT_API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  INGESTION_API_URL: z.string().url(),

  LLM_PROVIDER: z.enum(["gemini", "mock", "openai"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  SYSTEM_PROMPT: z
    .string()
    .default("You are a helpful AI assistant. Be concise, accurate, and conversational."),
  MAX_HISTORY_MESSAGES: z.coerce.number().int().positive().default(10),

  CORS_ORIGIN: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const cfg = parsed.data;

  const hasGemini = Boolean(cfg.GEMINI_API_KEY);
  const hasOpenai = Boolean(cfg.OPENAI_API_KEY);
  if (!hasGemini && !hasOpenai) {
    console.warn(
      "No GEMINI_API_KEY or OPENAI_API_KEY set — only LLM_PROVIDER=mock will work for chat.",
    );
  }

  if (cfg.LLM_PROVIDER === "gemini" && !hasGemini) {
    console.error("LLM_PROVIDER=gemini requires GEMINI_API_KEY (or change LLM_PROVIDER)");
    process.exit(1);
  }
  if (cfg.LLM_PROVIDER === "openai" && !hasOpenai) {
    console.error("LLM_PROVIDER=openai requires OPENAI_API_KEY (or change LLM_PROVIDER)");
    process.exit(1);
  }

  return cfg;
}
