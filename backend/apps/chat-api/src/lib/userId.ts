import { USER_ID_HEADER } from "@llm-logger/shared";
import type { FastifyRequest } from "fastify";

export function pickUserId(req: FastifyRequest): string | null {
  const raw = req.headers[USER_ID_HEADER];
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}
