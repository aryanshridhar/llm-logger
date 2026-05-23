// Prod: empty base URL → same-origin /api (e.g. CloudFront → ALB).
export const CHAT_API_URL: string = import.meta.env.PROD
  ? ((import.meta.env.VITE_CHAT_API_URL as string | undefined) ?? "")
  : ((import.meta.env.VITE_CHAT_API_URL as string | undefined) ?? "http://localhost:3001");
