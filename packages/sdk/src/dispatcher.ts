import type { InferenceLogPayload } from "@llm-logger/shared";
import pino from "pino";

const logger = pino({
  name: "sdk-dispatcher",
  level: process.env.LOG_LEVEL ?? "info",
});

export interface DispatcherOptions {
  ingestionUrl: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  fetchImpl?: typeof fetch;
}

export class LogDispatcher {
  private readonly ingestionUrl: string;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: DispatcherOptions) {
    this.ingestionUrl = opts.ingestionUrl.replace(/\/$/, "");
    this.maxRetries = opts.maxRetries ?? 3;
    this.initialBackoffMs = opts.initialBackoffMs ?? 200;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  send(payload: InferenceLogPayload): void {
    void this.deliverWithRetry(payload);
  }

  private async deliverWithRetry(payload: InferenceLogPayload): Promise<void> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const res = await this.fetchImpl(`${this.ingestionUrl}/api/logs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) return;

        if (res.status >= 400 && res.status < 500) {
          const body = await safeText(res);
          logger.warn({ status: res.status, body }, "Ingestion rejected payload (4xx) — dropping");
          return;
        }
        throw new Error(`Ingestion responded ${res.status}`);
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) {
          logger.warn({ err, attempt }, "Ingestion delivery failed permanently — dropping payload");
          return;
        }
        const backoff = this.initialBackoffMs * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unreadable body>";
  }
}
