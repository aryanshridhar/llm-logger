import { CHAT_API_URL } from "./env";
import { getUserId } from "./userId";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CHAT_API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": getUserId(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, `API ${path} returned ${res.status}`, body);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
