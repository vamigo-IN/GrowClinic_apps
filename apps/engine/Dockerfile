# syntax=docker/dockerfile:1
# GrowClinic Engine — multi-tenant CRM (Next.js 16, Prisma 6, PostgreSQL).
# Build context: apps/engine   (docker compose build engine)
#
# Replaces the old deploy/Dockerfile, which ran `prisma db push` on every start.
# Schema changes are now applied only by the platform `migrate` job.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
# Prisma's query engine links against OpenSSL 3.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- all dependencies ------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- production dependencies + generated Prisma client ---------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate

# ---- build -------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# ---- tools: one-off seed (`docker compose --profile tools run --rm engine-seed`) -----
FROM build AS tools
ENV NODE_ENV=production TZ=UTC
USER node
CMD ["npx", "tsx", "prisma/seed.ts"]

# ---- runtime -----------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=UTC

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.ts ./
COPY prisma ./prisma
RUN chown -R node:node /app/.next

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
