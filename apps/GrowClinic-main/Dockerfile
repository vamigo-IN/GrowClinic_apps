# syntax=docker/dockerfile:1
# GrowClinic website (www.growclinic.io) — Next.js 16 + Prisma (PostgreSQL).
#
# Targets:
#   runner  (default) — `next start` on :3000 as the non-root `node` user
#   tools             — full toolchain for one-off jobs (prisma/seed.ts)
#
# The image never runs migrations: the platform `migrate` job applies
# prisma/migrations before this container is allowed to start.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
# Prisma's query engine links against OpenSSL 3.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1

# ── all dependencies (build + tools) ─────────────────────────────────────────
# prisma/ is copied first: package.json's postinstall runs `prisma generate`.
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── production dependencies only (runtime image) ─────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Canonical public origin — inlined into client code and metadata at build time.
ARG NEXT_PUBLIC_APP_URL=https://www.growclinic.io
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN npx prisma generate && npx next build

# The image is built without a database, so every prerendered page above was
# rendered with empty DB content — no blog posts, case studies or testimonials,
# no sitemap entries and, via the root layout, no admin-managed GTM/GA4/Pixel/
# header scripts. Drop those build-time snapshots: the first request after start
# renders each page from the live database and ISR caches it from then on
# (same revalidate windows as before). Error pages and DB-free route handlers
# (robots.txt, llms.txt, favicon) keep their build output.
RUN cd .next/server/app \
 && find . -type f -name '*.html' ! -name '_not-found.html' ! -name '_global-error.html' | while read -r page; do \
      base="${page%.html}"; rm -rf "$base.html" "$base.rsc" "$base.meta" "$base.segments"; \
    done \
 && rm -f sitemap.xml.body sitemap.xml.meta \
 && ! find . -name '*.html' ! -name '_not-found.html' ! -name '_global-error.html' | grep -q .

# ── one-off tools (seed) ─────────────────────────────────────────────────────
FROM build AS tools
ENV NODE_ENV=production \
    TZ=UTC
USER node
CMD ["npx", "tsx", "prisma/seed.ts"]

# ── runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=UTC \
    UPLOAD_DIR=/data/uploads

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts

# Upload volume mount point, owned by the runtime user so a fresh named volume
# inherits the ownership. .next must be writable: ISR stores regenerated pages there.
RUN mkdir -p /data/uploads && chown -R node:node /data /app/.next

USER node
EXPOSE 3000

# /api/health is dynamic and always 200 while the server is up; each probe also
# publishes due scheduled posts (it replaces the external pinger used on Hostinger).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
