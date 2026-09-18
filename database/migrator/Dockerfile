# syntax=docker/dockerfile:1
# Platform migrate job: SQL migrations (core/audit/gmb) + prisma migrate deploy
# (growclinic/engine) against the shared PostgreSQL database.
#
# Built by docker compose with additional build contexts, so the image carries
# exactly the migration sources and nothing else from the repository:
#   sql            → database/migrations
#   privileges     → database/privileges
#   growclinic_prisma → apps/GrowClinic-main/prisma
#   engine_prisma     → apps/engine/prisma

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim

# Prisma's schema engine links against OpenSSL 3.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    TZ=UTC \
    MIGRATIONS_ROOT=/migrations \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund \
 # warm the Prisma engines now so the job never downloads at run time
 && node node_modules/prisma/build/index.js --version

COPY migrate.mjs ./
COPY --from=sql . /migrations/sql
COPY --from=privileges . /migrations/privileges
COPY --from=growclinic_prisma schema.prisma /migrations/growclinic/prisma/schema.prisma
COPY --from=growclinic_prisma migrations /migrations/growclinic/prisma/migrations
COPY --from=engine_prisma schema.prisma /migrations/engine/prisma/schema.prisma
COPY --from=engine_prisma migrations /migrations/engine/prisma/migrations

USER node
ENTRYPOINT ["node", "/app/migrate.mjs"]
