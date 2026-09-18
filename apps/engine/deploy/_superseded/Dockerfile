# syntax=docker/dockerfile:1
# Engine (CRM SaaS) — Next.js + Prisma production image.
# Built from the repo root:  docker build -f deploy/Dockerfile -t engine .

# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Prisma needs openssl at build + run time
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# No lockfile is committed yet, so use install (not ci). Generates node_modules.
RUN npm install --no-audit --no-fund
COPY . .
# `npm run build` already runs `prisma generate && next build`
RUN npm run build

# ---- Run stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Copy the built app (includes node_modules + generated Prisma client)
COPY --from=builder /app ./
EXPOSE 3000
# On boot: apply DB schema, then start Next. `db push` is safe/idempotent;
# switch to `prisma migrate deploy` once you adopt migrations.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
