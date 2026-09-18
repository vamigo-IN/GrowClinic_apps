# syntax=docker/dockerfile:1
# Gmb — Vite + React 18 SPA served by an Express 4 API (PostgreSQL via pg).
# Build context: apps/gmb   (docker compose build gmb)
#
# The SPA is built from source here (`vite build`); the committed dist/ folder
# is ignored so the image always matches the source.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# All packages (server + Vite toolchain) are declared as "dependencies".
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx vite build

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.js ./
COPY server ./server

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
