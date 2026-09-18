# GrowClinic Platform — Architecture

One Docker Compose project that runs the four GrowClinic applications as
separate containers on shared infrastructure: one reverse proxy, one PostgreSQL
database, one Redis, one migration job.

```
                               INTERNET
                                  │ 80/443
                   ┌──────────────▼───────────────┐
 production only → │  existing VPS Nginx (TLS)     │
                   └──────────────┬───────────────┘
                                  │ 127.0.0.1:<verified port>   (local dev: 127.0.0.1:18080)
┌─────────────────────────────────┼──────────────── growclinic-network (bridge) ─────────┐
│                  ┌──────────────▼───────────────┐                                       │
│                  │ reverse-proxy  nginx:1.28     │  host-based routing, real client IP,  │
│                  └──┬─────────┬─────────┬───────┬┘  rate limits, security headers       │
│        growclinic.io│  audit.…│   gmb.… │ engine.…                                      │
│     ┌───────────────▼┐ ┌──────▼─────┐ ┌─▼──────────┐ ┌▼─────────────┐                    │
│     │ growclinic     │ │ audit      │ │ gmb        │ │ engine       │  all :3000,        │
│     │ Next 16 Prisma │ │ Express 5  │ │ Vite+Expr. │ │ Next 16      │  none published    │
│     └───────┬────────┘ └──┬──────┬──┘ └──┬──────┬──┘ └──────┬───────┘                    │
│             │             │      └───────┼──┐   │           │                            │
│     ┌───────▼─────────────▼──────────────▼──┼───▼───────────▼──┐   ┌─────────────────┐    │
│     │ postgres 17 — ONE database "growclinic"                   │   │ redis 7.4        │   │
│     │  schemas: core │ growclinic │ audit │ gmb │ engine        │   │ ACL: audit:*,gmb:*│  │
│     └───────────────────────────▲──────────────────────────────┘   └─────────────────┘    │
│                                 │ DDL only                                                │
│                         ┌───────┴────────┐                                                │
│                         │ migrate (1-shot)│  SQL migrations + prisma migrate deploy        │
│                         └────────────────┘                                                │
└───────────────────────────────────────────────────────────────────────────────────────────┘
 volumes: postgres_data · redis_data · growclinic_uploads · audit_data
```

## 1. Source structure

**Decision: four application source directories inside one infrastructure
repository — not a formal monorepo.**

```
growclinic-platform/            (this repository)
├── docker-compose.yml          one Compose project "growclinic"
├── compose.dbtools.yml         opt-in: 127.0.0.1:15432 / 16379 for DB GUIs
├── compose.local-https.yml     opt-in: 127.0.0.1:18443 with mkcert certs
├── compose.import.yml          one-off MySQL → PostgreSQL import
├── .env.example                every variable, platform + all apps
├── apps/
│   ├── GrowClinic-main/        www.growclinic.io — Next.js 16 · Prisma 6.3.1 · Dockerfile (service `growclinic`)
│   ├── audit/                  Express 5 (CJS) · pg · Dockerfile
│   ├── gmb/                    Vite 6 + React 18 · Express 4 (ESM) · pg · Dockerfile
│   └── engine/                 Next.js 16 · Prisma 6.3.1 · Dockerfile
├── database/
│   ├── migrations/{core,audit,gmb}/   versioned SQL (Prisma apps keep theirs in apps/*/prisma/migrations)
│   ├── privileges/             per-schema grant overrides re-applied on every migrate run
│   ├── migrator/               the migrate job (Node + pg + prisma CLI 6.3.1)
│   └── import/                 importer, fixtures, MySQL source loader
├── proxy/                      nginx.conf, conf.d/<app>.conf, snippets/, optional/
├── redis/redis.conf
├── scripts/                    check-ports, generate-secrets, migrate, backup, restore, smoke-test
└── tests/audit-db.test.js      Audit data-layer regression test (PostgreSQL)
```

Why not Turborepo/Nx/workspaces: the apps share **no code** and use different
module systems (ESM/CJS), frameworks and dependency trees; each keeps its own
`package-lock.json` and builds independently (`docker compose build <app>`).
A workspace tool would force lockfile regeneration and couple releases without
removing any duplication. The shared layer is infrastructure, and that is what
the repository root holds.

## 2. Applications

| Service | Domain | Stack (locked versions) | Container port | Health check |
|---|---|---|---|---|
| `growclinic` | www.growclinic.io (apex → 301 www) — source `apps/GrowClinic-main` | Next 16.2.1, React 19.2.3, NextAuth 5.0.0-beta.30, Prisma 6.3.1, TipTap 3 | 3000 | the app's `GET /api/health` (dynamic, always 200 while up; each probe also publishes due scheduled posts) |
| `audit` | audit.growclinic.io | Express 5.2, CommonJS, pg 8.23, OpenAI 6, Nodemailer 6, redis 6 | 3000 | existing `GET /api/health` |
| `gmb` | gmb.growclinic.io | Vite 6.3.5 + React 18.3.1 SPA, Express 4.21 (ESM), pg 8.23, redis 6 | 3000 | existing `GET /api/health` |
| `engine` | engine.growclinic.io | Next 16.2.2, React 19.2.4, Prisma 6.3.1 | 3000 | existing `GET /api/health` (checks DB) |

All run `NODE_ENV=production` production builds (`next start`, `node server.js`
serving a `vite build` output) as the unprivileged `node` user.

### Runtime version decisions
- **Node 22 LTS** (`node:22-bookworm-slim`, build arg `NODE_VERSION`). Node 20
  reached end-of-life on 2026-04-30; every app's `engines` range and toolchain
  (Next ≥ 20.9, Prisma 6.3, Vite 6, Express 4/5) supports 22. All four images
  build and pass the smoke suite on 22. Setting `NODE_VERSION=20` still works.
- **Prisma: Engine 5.22 → 6.3.1**, matching GrowClinic. Engine's schema uses no
  feature affected by Prisma 6's breaking changes (no `Bytes`, no implicit
  many-to-many, no `NotFoundError`), it had no lockfile (one had to be created
  anyway), and one Prisma CLI version in the migrate job now applies both apps'
  migrations. Both apps now use real migrations instead of `db push`.
- **Next/React patch levels are left as locked** (16.2.1/16.2.2, 19.2.3/19.2.4):
  separate containers, no shared runtime — aligning them would be cosmetic churn.
- **GMB stays on React 18.** Its Radix/vaul/recharts/react-day-picker 8 pins were
  resolved against React 18; React 19 would bring peer upgrades into a
  prototype UI for no platform benefit.
- **PostgreSQL 17** (Prisma 6.3 supports up to 17), **Redis 7.4**, **Nginx 1.28**.

## 3. Docker architecture

| Service | Image | Published | Volumes | Notes |
|---|---|---|---|---|
| reverse-proxy | nginx:1.28-alpine | `127.0.0.1:18080→80` (`PROXY_HTTP_BIND`) | config (ro) | only published port |
| growclinic | growclinic-platform/growclinic:local | — | `growclinic_uploads:/data/uploads` | |
| audit | growclinic-platform/audit:local | — | `audit_data:/data` | reports, leads.json, .admin-password |
| gmb | growclinic-platform/gmb:local | — | — | stateless |
| engine | growclinic-platform/engine:local | — | — | stateless |
| postgres | postgres:17-bookworm | — | `postgres_data` | |
| redis | redis:7.4-alpine | — | `redis_data` | AOF persistence |
| migrate | growclinic-platform/migrate:local | — | — | one-shot, `restart: "no"` |
| growclinic-seed, engine-seed | `tools` build targets | — | — | profile `tools`, never started by `up` |
| import-mysql, import | mysql:8.4 / import:local | — | tmpfs | `compose.import.yml`, profile `import` |

Start-up order is enforced with health conditions:
`postgres (healthy) → migrate (completed successfully) → apps`;
`redis (healthy) → audit, gmb`. The proxy does not depend on the apps — its
upstreams use `server … resolve`, so it starts even when an app is down and
follows containers across restarts/IP changes.

Every service has `restart: unless-stopped` (except one-shot jobs),
`no-new-privileges`, json-file log rotation (10 MB × 5), and a memory limit.
Application containers additionally drop **all** Linux capabilities (verified:
`CapEff 0000000000000000`); the proxy keeps only the five it needs.

| Memory limit | growclinic 768M · audit 512M · engine 512M · gmb 256M · postgres 1G · redis 192M · proxy 64M |
|---|---|
| Measured idle (local) | growclinic ~100M after warm-up · engine 49M · audit 46M · gmb 31M · postgres 43M · proxy 15M · redis 3M ≈ **290 MB** |

Image sizes: growclinic 1.29 GB, engine 1.21 GB (full `node_modules` incl.
Prisma CLI + Cal.com/TipTap), gmb 599 MB, migrate 466 MB, audit 371 MB.

## 4. Networking and ports

- One user-defined bridge network, `growclinic-network`; containers reach each
  other by service name (`postgres:5432`, `redis:6379`, `audit:3000`, …).
  Nothing uses `localhost` for inter-container traffic.
- Only the proxy publishes a host port, on **127.0.0.1** only. Every app listens
  on container port 3000 — no conflict, separate network namespaces.
- PostgreSQL/Redis are never published by `docker-compose.yml`; `compose.dbtools.yml`
  adds loopback-only 15432/16379 for local tools.
- Full port report, the production port inventory and the verification
  procedure: **[PORTS.md](PORTS.md)**.

## 5. Reverse proxy (Nginx)

`proxy/nginx.conf` + `proxy/conf.d/{growclinic,audit,gmb,engine}.conf`:

| Server names | Upstream | Specifics |
|---|---|---|
| growclinic.io | — | `301 https://www.growclinic.io$request_uri` (www is the canonical host of metadata, sitemap, robots, IndexNow) |
| www.growclinic.io, growclinic.localhost, growclinic.local | `growclinic:3000` | 25 MB body (admin uploads); `limit_req` on the NextAuth credentials callback (10 r/min, burst 5), on **POSTs** to `/admin/login` (the login form is a server action; page GETs unthrottled) and on public form APIs `/api/(contact\|bookings\|leads\|audit\|audit-intake)` (30 r/min) |
| audit.growclinic.io, audit.growclinic.localhost, audit.growclinic.local | `audit:3000` | 300 s read timeout (AI report generation); no added security headers (the app sets its own CSP/XFO/HSTS) |
| gmb.growclinic.io, gmb.growclinic.localhost, gmb.growclinic.local | `gmb:3000` | |
| engine.growclinic.io, engine.growclinic.localhost, engine.growclinic.local | `engine:3000` | `limit_req` on `/api/ingest/lead` (120 r/min, burst 30) |
| anything else | — | `444` (connection closed); `/healthz` for the container health check |

**Client IP across two proxies.** Audit and GMB use Express `trust proxy 1` and
rate-limit by `req.ip`. Behind the VPS Nginx *and* this proxy, a naïve
`X-Forwarded-For` append would make every visitor appear as the Docker gateway.
The proxy therefore uses `real_ip` (trusting only private/loopback ranges,
`real_ip_recursive on`) and forwards a **single** `X-Forwarded-For: $remote_addr`.
Verified: with `X-Forwarded-For: <spoofed>, 203.0.113.77` from a trusted hop,
GMB stores `203.0.113.77` and Audit's per-IP limiter isolates clients.

Forwarded headers: `Host`/`X-Forwarded-Host` = `$http_host` (keeps `:18080`
locally), `X-Forwarded-Proto` = the edge proxy's value (https in production) or
this hop's scheme. Access logs are JSON on stdout and record `$uri`, **not**
`$request_uri`, so tokens in query strings (`?key=`, `?code=`, `?t=`) are never
logged. `server_tokens off`, `X-Powered-By` hidden, gzip for text types.

Baseline headers for growclinic/gmb/engine: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
`Permissions-Policy`. HSTS is left to the TLS-terminating VPS Nginx.

## 6. PostgreSQL

**One database, `growclinic`**, one schema per application plus `core`:

| Schema | Owner role (NOLOGIN) | Runtime role (LOGIN, conn. limit) | Managed by |
|---|---|---|---|
| core | superuser | — | migrate job (`core.schema_migrations` ledger) |
| growclinic | growclinic_owner | growclinic_app (10) | Prisma migrations |
| audit | audit_owner | audit_app (12) | `database/migrations/audit` |
| gmb | gmb_owner | gmb_app (10) | `database/migrations/gmb` |
| engine | engine_owner | engine_app (10) | Prisma migrations |

- Runtime roles have `USAGE` on **their own schema only** and
  `SELECT/INSERT/UPDATE/DELETE` on its tables/sequences — no DDL, no `TRUNCATE`,
  no access to other schemas, `public` or `core`. Verified: `audit_app` cannot
  read `engine."Lead"`; `engine_app` cannot `CREATE SCHEMA`; `gmb_app` cannot
  `DELETE` from the append-only `gmb.audit_events`; app roles cannot touch
  `_prisma_migrations`.
- Owner roles own every object (the migrate job normalises ownership after
  Prisma runs as superuser). `REVOKE ALL ON DATABASE … FROM PUBLIC`.
- `search_path` is per app (`?schema=` for Prisma, `-c search_path=` for pg).
- Timezone UTC at database, role and connection level; `timestamptz` for the
  raw-SQL apps (Prisma keeps its UTC `timestamp(3)` convention).
- `citext` is installed in the `growclinic` schema (case-insensitive email,
  slugs of posts/projects/case studies, tag names — the MySQL `_ci` semantics
  those columns relied on).

### GrowClinic website rendering (ISR without a build-time database)
The website uses ISR (`revalidate` 60 s home, 300 s blog/case studies/
testimonials, 3600 s sitemap) and its root layout reads admin-managed tracking
(GTM, GA4, Meta Pixel, header/footer scripts) from `SiteSettings`. Images are
built without a database, so `next build` would snapshot every page with empty
DB content and no tracking. The Dockerfile deletes those prerendered snapshots
(`.next/server/app/*.html|.rsc|.meta|.segments`, `sitemap.xml.body`) after the
build; the first request after start renders each page from the live DB and ISR
caches it (`x-nextjs-cache: MISS` → `HIT`). `_not-found`, `_global-error`,
`robots.txt`, `llms.txt` and `favicon.ico` keep their build output. The ISR
cache lives in the container filesystem (`.next`, writable by `node`) and is
rebuilt on demand after a container is recreated.

### Migration ownership
Applications **never** run DDL at start-up anymore (Audit's boot-time
`CREATE/ALTER TABLE`, GMB's `schema.sql` auto-run and Engine's `prisma db push`
were removed; Audit and GMB only verify the schema exists). The single
`migrate` job, holding a PostgreSQL advisory lock:

1. creates/syncs roles (passwords from `.env`, connection limits),
2. applies `core → audit → gmb` SQL migrations, each in one transaction with
   its checksummed ledger row (an edited applied file aborts the run),
3. runs `prisma migrate deploy` for growclinic and engine,
4. normalises ownership and re-applies least-privilege grants + overrides.

`MIGRATE_MODE=apply` (local) applies on `docker compose up`;
`MIGRATE_MODE=check` (production) fails — and thereby keeps the apps from
starting — while anything is pending, so production schema changes happen only
through an explicit `./scripts/migrate.sh apply` after a backup. Forward-only;
there is no reset command.

### Connection budget

`max_connections = 60`, `superuser_reserved_connections = 3`.

| Consumer | Pool | Per-role hard cap |
|---|---|---|
| growclinic (Prisma `connection_limit=5`) | 5 | 10 |
| engine (Prisma `connection_limit=5`) | 5 | 10 |
| audit (pg `DB_POOL_MAX=6`) | 6 | 12 |
| gmb (pg `DB_POOL_MAX=5`) | 5 | 10 |
| **apps steady state** | **21** | |
| migrate job | ≤ 2 | superuser |
| backups / psql / maintenance | ≤ 5 | superuser |
| reserved superuser slots | 3 | |
| **planned total** | **≈ 31 of 60** | |

The per-role caps are 2× each pool so a container replacement (old + new
instance briefly overlapping) still fits: worst case 42 app + 10 admin + 3
reserved = 55 < 60. One misbehaving app hits its own role cap instead of
starving the others. Observed idle: audit 3, engine 1, gmb 1, admin 2.

Memory sizing (`shared_buffers 256MB`, `effective_cache_size 768MB`,
`work_mem 4MB`, limit 1 GB) suits a 4–8 GB VPS that also runs other services;
raise via `.env` on a larger host.

## 7. Redis

One `redis:7.4-alpine`, private network only, AOF + RDB persistence to
`redis_data`, `maxmemory 128mb` with `volatile-lru` (only keys with a TTL are
evicted). ACL users are rendered at start from `.env`:

| User | Key pattern | Commands |
|---|---|---|
| default | — | `PING` only (health check) |
| audit | `audit:*` | `@connection @read @write @keyspace @string`, minus `@dangerous` |
| gmb | `gmb:*` | same |

Verified: the audit user gets `NOPERM` on `gmb:*` keys and on `FLUSHALL`.

**What uses it:** the one-time **handoff tokens** of Audit (`/api/intake` →
`/api/handoff/:token`) and GMB (`POST /api/handoff` → `GET /api/handoff/:token`).
They previously lived in process memory and were lost on any restart inside
their 15-minute window. Stored as `SET … PX` and redeemed atomically with
`GETDEL` (single use); if Redis is unreachable the apps fall back to the
previous in-memory behaviour. Verified: a token survives `docker compose restart audit`.

Deliberately **not** moved (yet): Audit's OTP store and rate-limit windows, GMB's
Places cache — they work correctly per single instance, and moving them changes
security-sensitive logic; they are the natural next candidates if an app is
ever scaled to more than one container. GrowClinic and Engine have no Redis
user (least privilege) — add one in `docker-compose.yml` when needed.

## 8. Storage

| Data | Where | Why it must persist |
|---|---|---|
| All relational data | `postgres_data` | |
| Admin-uploaded images (GrowClinic blog/projects/testimonials) | `growclinic_uploads` → `/data/uploads` (`UPLOAD_DIR`) | served by `/api/uploads/<file>` |
| Generated audit reports `<sessionId>.json` | `audit_data` → `/data/reports` | report links sent over WhatsApp/email point at them |
| `leads.json` transcript log | `audit_data` → `/data/leads.json` | was written into the code directory (lost on redeploy) |
| `.admin-password` (generated Audit admin password) | `audit_data` → `/data/.admin-password` (0600) | |
| Handoff tokens | `redis_data` | short-lived, but survive restarts |

GMB and Engine keep no files. Verified: all of the above survive
`docker compose down` + `up`. **Volumes are not backups** — see §12.

`docker compose down -v` deletes these volumes. It appears in no script or
normal instruction; treat it as destructive.

## 9. Authentication and sessions

| App | Mechanism | Behind the proxies |
|---|---|---|
| growclinic | NextAuth v5 credentials (bcrypt), JWT session cookie, roles admin/manager/viewer; `proxy.ts` redirects `/admin/*` when no session cookie is **present** (it does not verify it) — every API route and server action verifies the session itself | `AUTH_TRUST_HOST=true` **and** `AUTH_URL` = public origin (otherwise route-handler redirects pointed at `0.0.0.0:3000`). https `AUTH_URL` ⇒ `__Secure-` cookies, which `proxy.ts` already recognises. |
| audit | scrypt passwords, per-user RBAC (7 roles), per-user TOTP 2FA, opaque session token in `admin_sessions`, cookie `gc_admin` HttpOnly SameSite=Strict (+Secure in production), login lockout | `trust proxy 1` + single normalised `X-Forwarded-For` |
| gmb | WhatsApp OTP (hashed codes, per-phone hourly cap), opaque session in `gmb.sessions`, cookie `gmb_session` HttpOnly SameSite=Lax (+Secure), org-scoped RBAC | same |
| engine | activation keys (SHA-256 of a 144-bit random key) + per-key origin allow-list for ingest; **no admin login exists in the code yet**; passwords now scrypt | CORS handled in-app |

Secure cookies over plain HTTP: browsers accept them on `*.localhost` (a secure
context), so local admin logins work at `http://*.growclinic.localhost:18080`.
The `.local` fallback names are **not** secure contexts — use
`compose.local-https.yml` for admin logins there.

## 10. Cross-application communication

Searched all four codebases for webhook/API URLs, `fetch`, shared secrets and
handoffs. What exists:

| Flow | Receiving endpoint (exists) | Caller in supplied code | Status |
|---|---|---|---|
| GrowClinic site → Audit lead handoff | `POST audit…/api/intake` (header `x-growclinic-signature` = `INTAKE_SECRET`) → one-time token → `GET /api/handoff/:token` | website `/api/audit-intake` and `/api/audit` (`src/lib/audit-webhook.ts`) via **`http://audit:3000/api/intake`**; `AUDIT_WEBHOOK_SECRET` = `AUDIT_INTAKE_SECRET` | wired, tested end-to-end (token minted, prefill exchanged once, delivery status stored in `ClinicAudit.webhook*`) |
| GrowClinic site → Audit CRM | `POST audit…/api/lead-magnet` (rate-limited per IP) | website `/api/contact` and `/api/bookings` (`src/lib/push-to-crm.ts`, fire-and-forget) via **`http://audit:3000`** with `X-Inbound-Key` = `AUDIT_INBOUND_LEADS_KEY` | wired, tested (rows land in `audit.popup_leads`) |
| Audit → GMB handoff | `POST gmb…/api/handoff` (HMAC `x-handoff-key`, `INBOUND_HANDOFF_KEY`) | **none** | preserved, now fails closed without a key, tested |
| Any site → Engine | `POST engine…/api/ingest/lead` + `embed.js` | external clinic websites | preserved, tested |
| External CRM/n8n ↔ Audit | `/api/crm/leads` (X-API-Key), `/api/integrations/inbound/:channel`, outbound webhooks | external | preserved |

Decisions: no caller was invented — the website's callers come from
`apps/GrowClinic-main`. Sharing a database does **not** replace these HTTP
contracts (each app owns its schema and business rules; cross-schema reads are
blocked by grants). Inside the platform the website calls the audit tool on the
private network (`http://audit:3000`), so these requests never leave the host
and never pass the public edge. Note: all server-side pushes to `/api/lead-magnet`
share the website container's IP, so Audit's per-IP popup limit (6/min) caps
website contact + booking forwards at 6/min (unchanged from Hostinger, where
they shared the server IP).

Other outbound calls of the website: IndexNow (`api.indexnow.org`, only when
`GROWCLINIC_INDEXNOW_ENABLED=true` — production only), ImageKit uploads, Google
Sheet webhook, SMTP, WhatsApp, and the admin Integrations page, which fetches the
**public** site (`https://www.growclinic.io`) and provider tag endpoints to show
live status.

## 11. Observability

```bash
docker compose ps                         # state + health of every service
docker compose logs -f [service]          # app logs; proxy access log is JSON
docker compose exec postgres pg_isready -U gc_admin -d growclinic
docker compose exec redis redis-cli ping
curl -s http://127.0.0.1:18080/healthz    # proxy
curl -s http://audit.growclinic.localhost:18080/api/health
curl -s http://gmb.growclinic.localhost:18080/api/health
curl -s http://engine.growclinic.localhost:18080/api/health   # includes DB check
./scripts/migrate.sh status               # schema state
./scripts/smoke-test.sh                   # 127 end-to-end checks (local only)
docker stats --no-stream
```

Logs: json-file driver, 10 MB × 5 files per container (≤ 50 MB each), so logs
cannot fill the disk. PostgreSQL logs statements slower than 1 s.

## 12. Backups

`scripts/backup.sh` (read-only against the running stack) writes a timestamped
directory with: `pg_dump -Fc` of the whole database (verified with
`pg_restore --list`), `pg_dumpall --globals-only` (roles; contains password
hashes — protect it), tarballs of `growclinic_uploads` and `audit_data`, and
`SHA256SUMS`. Retention: `BACKUP_RETENTION_DAYS` (default 14) prunes only
timestamped directories inside the backup root.

`scripts/restore.sh <dir>` by default restores into a scratch database
`growclinic_restore_check` and prints row counts (non-destructive
verification). `--replace-live` is the only destructive path: it demands typing
the database name, stops the apps, restores DB + volumes, re-runs the migrate
job and restarts the apps.

Production strategy: nightly cron `backup.sh` to local disk, then copy off the
VPS (object storage / another host); keep 14 daily + 8 weekly; run
`restore.sh <latest>` (verify mode) weekly; always take a backup before
`migrate.sh apply` and before deployments. Docker volumes and VPS snapshots are
not a substitute: they share the failure domain with the live data.

## 13. Production deployment model

TLS and ports 80/443 stay with the **existing VPS Nginx**; the platform proxy
listens on a verified free loopback port. See **[DEPLOYMENT.md](DEPLOYMENT.md)**
for the step-by-step VPS plan, the production migration plan, and rollback.

```nginx
# VPS Nginx (existing, TLS via the existing certbot), one block per domain:
server {
    listen 443 ssl http2;
    server_name engine.growclinic.io;
    ssl_certificate     /etc/letsencrypt/live/engine.growclinic.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/engine.growclinic.io/privkey.pem;
    # (audit.growclinic.io already sends its own HSTS header — don't add a second one there)
    add_header Strict-Transport-Security "max-age=31536000" always;
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:18080;          # the VERIFIED platform port
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
    }
}
```
