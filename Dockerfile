# syntax=docker/dockerfile:1
# LiveKit Cloud Agent image. Fly uses apps/backend/Dockerfile explicitly.
FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global pnpm@10.33.0
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter assistant build
RUN pnpm --filter assistant exec node dist/main.js download-files

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "assistant", "exec", "node", "dist/main.js", "start"]
