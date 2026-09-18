# syntax=docker/dockerfile:1
# One-off MySQL → PostgreSQL import tool (profile "import"; never started by `up`).
# mysql2 is required here — and only here — to READ the legacy MySQL dumps.
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production TZ=UTC
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund
COPY import.mjs ./
USER node
ENTRYPOINT ["node", "/app/import.mjs"]
