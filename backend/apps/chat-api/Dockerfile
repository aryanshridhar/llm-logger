FROM node:22-alpine
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY frontend/package.json ./frontend/
COPY packages ./packages
COPY backend ./backend

RUN pnpm install --prefer-frozen-lockfile=false
RUN pnpm --filter @llm-logger/db exec prisma generate

ENV NODE_ENV=production
EXPOSE 3001

CMD ["pnpm", "--filter", "@llm-logger/chat-api", "exec", "tsx", "src/index.ts"]
