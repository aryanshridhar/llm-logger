import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  AWS_REGION: z.string().default("ap-south-1"),
  SQS_QUEUE_URL: z.string().url(),
  SQS_ENDPOINT: z.string().url().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  DATABASE_URL: z.string().url(),
  BATCH_SIZE: z.coerce.number().int().min(1).max(10).default(10),
  WAIT_TIME_SECONDS: z.coerce.number().int().min(0).max(20).default(20),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
