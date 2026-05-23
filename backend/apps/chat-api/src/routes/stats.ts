import { getPrisma } from "@llm-logger/db";
import { type StatsRange, statsRangeSchema } from "@llm-logger/shared";
import type { FastifyInstance } from "fastify";

import { pickUserId } from "../lib/userId.js";

export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
  const prisma = getPrisma();

  app.get<{ Querystring: { range?: string } }>("/api/stats", async (request, reply) => {
    const userId = pickUserId(request);
    if (!userId) return reply.code(400).send({ error: "missing_user_id_header" });

    const range = statsRangeSchema.safeParse(request.query.range ?? "24h");
    if (!range.success) return reply.code(400).send({ error: "invalid_range" });

    const since = rangeToSince(range.data);
    const bucketSize = rangeToBucketSize(range.data);

    const [totals, series, byModel] = await Promise.all([
      computeTotals(prisma, userId, since),
      computeSeries(prisma, userId, since, bucketSize),
      computeByModel(prisma, userId, since),
    ]);

    return {
      range: range.data,
      totalRequests: totals.totalRequests,
      successRate: totals.successRate,
      errorCount: totals.errorCount,
      cancelledCount: totals.cancelledCount,
      avgLatencyMs: totals.avgLatencyMs,
      p95LatencyMs: totals.p95LatencyMs,
      totalTokens: totals.totalTokens,
      series,
      byModel,
    };
  });

  app.get<{ Querystring: { limit?: string } }>("/api/logs", async (request, reply) => {
    const userId = pickUserId(request);
    if (!userId) return reply.code(400).send({ error: "missing_user_id_header" });

    const limit = Math.min(Math.max(Number(request.query.limit ?? 50), 1), 200);
    const rows = await prisma.inferenceLog.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: {
        id: true,
        conversationId: true,
        provider: true,
        model: true,
        status: true,
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        inputPreview: true,
        outputPreview: true,
        errorMessage: true,
        receivedAt: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      receivedAt: r.receivedAt.toISOString(),
    }));
  });
}

function rangeToSince(range: StatsRange): Date {
  const now = Date.now();
  switch (range) {
    case "1h":
      return new Date(now - 60 * 60 * 1000);
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
}

function rangeToBucketSize(range: StatsRange): string {
  // Bucket sizes chosen so each range gives ~20-30 points on the chart.
  switch (range) {
    case "1h":
      return "5 minutes";
    case "24h":
      return "1 hour";
    case "7d":
      return "6 hours";
  }
}

async function computeTotals(prisma: ReturnType<typeof getPrisma>, userId: string, since: Date) {
  const rows = await prisma.inferenceLog.findMany({
    where: { userId, receivedAt: { gte: since } },
    select: { status: true, latencyMs: true, totalTokens: true },
  });

  const totalRequests = rows.length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
  const successCount = totalRequests - errorCount - cancelledCount;
  const successRate = totalRequests === 0 ? null : successCount / totalRequests;

  const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgLatencyMs =
    latencies.length === 0 ? 0 : latencies.reduce((s, n) => s + n, 0) / latencies.length;
  const p95Idx = Math.max(0, Math.floor(latencies.length * 0.95) - 1);
  const p95LatencyMs = latencies.length === 0 ? 0 : (latencies[p95Idx] ?? 0);

  const totalTokens = rows.reduce((s, r) => s + (r.totalTokens ?? 0), 0);

  return {
    totalRequests,
    successRate,
    errorCount,
    cancelledCount,
    avgLatencyMs: Math.round(avgLatencyMs),
    p95LatencyMs,
    totalTokens,
  };
}

async function computeSeries(
  prisma: ReturnType<typeof getPrisma>,
  userId: string,
  since: Date,
  bucketSize: string,
) {
  // Postgres date_trunc + generate_series gives us evenly-bucketed time slots,
  // including buckets with zero rows. Using parameterized $1/$2 keeps it safe.
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      bucket: Date;
      requests: bigint;
      avg_latency: number | null;
      errors: bigint;
      tokens: bigint | null;
    }>
  >(
    `
    WITH buckets AS (
      SELECT generate_series(
        date_trunc('hour', $1::timestamptz),
        now(),
        ($2)::interval
      ) AS bucket
    )
    SELECT
      b.bucket,
      COALESCE(COUNT(l.id), 0)::bigint AS requests,
      COALESCE(AVG(l.latency_ms), 0)::float AS avg_latency,
      COALESCE(SUM(CASE WHEN l.status = 'error' THEN 1 ELSE 0 END), 0)::bigint AS errors,
      COALESCE(SUM(l.total_tokens), 0)::bigint AS tokens
    FROM buckets b
    LEFT JOIN inference_logs l
      ON l.user_id = $3
      AND l.received_at >= b.bucket
      AND l.received_at <  b.bucket + ($2)::interval
    GROUP BY b.bucket
    ORDER BY b.bucket ASC
    `,
    since,
    bucketSize,
    userId,
  );

  return rows.map((r) => ({
    bucket: r.bucket.toISOString(),
    requests: Number(r.requests),
    avgLatencyMs: Math.round(r.avg_latency ?? 0),
    errors: Number(r.errors),
    tokens: Number(r.tokens ?? 0),
  }));
}

async function computeByModel(prisma: ReturnType<typeof getPrisma>, userId: string, since: Date) {
  const grouped = await prisma.inferenceLog.groupBy({
    by: ["model"],
    where: { userId, receivedAt: { gte: since } },
    _count: { _all: true },
    _avg: { latencyMs: true },
  });
  return grouped.map((g) => ({
    model: g.model,
    requests: g._count._all,
    avgLatencyMs: Math.round(g._avg.latencyMs ?? 0),
  }));
}
