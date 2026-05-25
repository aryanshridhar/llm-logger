# LLM Logger

Lightweight LLM inference logging: a streaming chat UI, a reusable SDK, an async ingestion pipeline (SQS), and a metrics dashboard.

## Setup instructions

### Prerequisites

- **Node.js** 22+ and **pnpm** 9+
- **Docker** (for local Postgres)

### 1. AWS credentials

`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are **not** committed to the repo. They are shared separately over email.

Add them to `.env.example` (along with the existing `AWS_REGION` and `SQS_QUEUE_URL` values) before running setup:

```env
AWS_ACCESS_KEY_ID=<from email>
AWS_SECRET_ACCESS_KEY=<from email>
```

The setup script copies `.env.example` → `.env`, so filling these in beforehand ensures the log pipeline can publish to and consume from the configured SQS queue.

### 2. Run setup

From the repo root:

```bash
pnpm setup
```

This will:

1. Copy `.env.example` to `.env` (if not already present) and prompt for LLM API keys (or use `--mock` for no external APIs)
2. Start Postgres via Docker Compose
3. Install dependencies and run `prisma generate` + `db push`
4. Start all dev servers (`pnpm dev`)

**Options**

| Flag | Effect |
|------|--------|
| `--mock` | Skip API key prompts; use `LLM_PROVIDER=mock` |

### 3. URLs

| Service | URL |
|---------|-----|
| Chat UI | http://localhost:5173 |
| Dashboard | http://localhost:5173/dashboard |
| Chat API | http://localhost:3001 |
| Ingestion API | http://localhost:3002 |
| Health | http://localhost:3001/health |

---

## Architecture overview

High-level layout: React frontend → **chat-api** (Postgres + LLM via SDK) and a separate async path **SDK → ingestion-api → SQS → worker → Postgres** for inference logs.

For ingestion flow, logging strategy, scaling, and failure assumptions, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Schema design decisions

### Three core models

- **`Conversation`** — Per-user thread with title and `updated_at` for sidebar ordering (`@@index([userId, updatedAt])`).
- **`Message`** — Chat history (`user` / `assistant` / `system`). Cascade-deletes with the conversation.
- **`InferenceLog`** — One row per LLM call: latency, tokens, status, provider/model, and optional link to the assistant `Message`.

### Chat vs logs

Messages store full chat content for the UI. Inference logs store **previews** (`input_preview` / `output_preview`, max 500 chars) plus structured metrics. Full prompts and completions are not duplicated in the log table, which keeps the dashboard dataset smaller and reduces accidental retention of large payloads.

### Optional `messageId`

`InferenceLog.messageId` is unique and nullable, with `onDelete: SetNull` so deleting a message does not remove the log. Logs can still be correlated to conversations when the message exists.

### Indexing for the dashboard

Indexes on `received_at`, `(conversation_id, received_at)`, `(model, received_at)`, and `(status, received_at)` support time-range stats, model breakdowns, and success-rate queries without full table scans.

### Context metadata

`context_messages_included` and `context_strategy` (e.g. `sliding_window_last_n`) are stored on each log so we can reason about what was sent to the model without storing the full context blob.

---

## Tradeoffs made

Built as a **demo-first** system: optimize for something reviewers can run and reason about quickly, not for multi-region scale on day one. The tables below are **design choices** (what we optimized for vs what we gave up). How each component retries, drops, or recovers is documented in [ARCHITECTURE.md → Failure handling](./ARCHITECTURE.md#failure-handling-assumptions); today’s deployment shape and scale limits are in [ARCHITECTURE.md → Scaling](./ARCHITECTURE.md#scaling-considerations).

### Consistency vs availability

| Choice | What we optimized for | What we gave up |
|--------|------------------------|------------------|
| **Async log path** (separate from chat writes) | Chat hot-path latency and availability | Strong consistency between “stream finished” and “row on dashboard” |
| **Fire-and-forget logging** | User-facing completion never blocks on observability | Durability guarantees—logging is not part of the chat transaction |
| **At-least-once queue delivery** | Simple consumer recovery | Exactly-once semantics without explicit idempotency keys |

### Deployment & data architecture

| Choice | What we optimized for | What we gave up |
|--------|------------------------|------------------|
| **Single EC2 + Docker Compose (prod)** | Low operational complexity for a demo | Horizontal scale, blast-radius isolation, per-service autoscaling |
| **Postgres for chat and dashboard stats** | One store, one Prisma schema, fastest path to shipped metrics | OLAP performance under heavy dashboard load (see improvements below) |

### Scope & security (demo boundaries)

| Choice | What we optimized for | What we gave up |
|--------|------------------------|------------------|
| **User ID is sent as a header (`x-user-id`)** | No login screen; the app works immediately | Real sign-in — anyone who can call the API can pick any user ID |
| **Inference logs store short snippets** | A smaller metrics table that loads quickly on the dashboard | Reading the full prompt or reply from the dashboard — use the chat screen for the complete message |

---

## What I would improve with more time

1. **Authentication** — Sessions or API keys instead of a client-supplied `x-user-id`.
2. **Deployment & analytics store** — Split OLTP (conversations/messages) from log ingestion and dashboard analytics; target topology and components are in [ARCHITECTURE.md → At scale](./ARCHITECTURE.md#at-scale) and [docs/scaled-hld.png](docs/scaled-hld.png).

   **Why the current stats path will bottleneck** — `GET /api/stats` in `chat-api` aggregates directly on `inference_logs` in Postgres (`backend/apps/chat-api/src/routes/stats.ts`):
   - `computeTotals` loads every matching log row for the user and time range into the API process, then aggregates in Node (memory grows with window size).
   - `computeSeries` runs a `generate_series` time grid left-joined to `inference_logs` per request (CPU and I/O scale with table size and bucket count).
   - `computeByModel` adds another `groupBy` on the same table.

   Fine for demos; under growing **log volume**, **dashboard concurrency**, or **range width** (especially `7d`), p95 on `/api/stats` and memory on chat-api rise before chat writes do.
3. **Reliable logging** — SQS dead-letter queue, idempotency keys on `InferenceLog`, alerting when dispatcher drops exceed a threshold (gaps called out in [failure handling](./ARCHITECTURE.md#failure-handling-assumptions)).
4. **Observability** — OpenTelemetry across chat-api, ingestion-api, and worker; correlation IDs on log payloads.
5. **Dashboard depth** — Per-user filters, export, drill-down from log row to conversation/message, stop/regenerate on streams.
6. **Content policy** — Configurable retention, PII redaction before previews, optional encrypted storage for full payloads.
