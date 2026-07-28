# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN bun install --global pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contract/package.json packages/contract/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/prompts/package.json packages/prompts/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @english-coach/backend build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "--filter", "@english-coach/backend", "start"]
