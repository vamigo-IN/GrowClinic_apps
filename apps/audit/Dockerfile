# syntax=docker/dockerfile:1
# GrowClinic Audit tool (Express 5, CommonJS, PostgreSQL via pg).
# Build context: apps/audit   (docker compose build audit)
#
# Persistent data (generated reports, leads.json, .admin-password) lives in
# /data — mounted from the audit_data volume. Never baked into the image.

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=UTC \
    DATA_DIR=/data \
    REPORTS_DIR=/data/reports

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

COPY . .

# Volume mount point owned by the runtime user (a fresh named volume inherits it).
RUN mkdir -p /data/reports && chown -R node:node /data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
