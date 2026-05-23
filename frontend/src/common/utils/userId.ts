const STORAGE_KEY = "llm-logger.userId";

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr-anonymous";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const fresh = generateUuid();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback for ancient browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
