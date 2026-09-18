# GrowClinic Platform

One Docker Compose platform for the four GrowClinic applications — separate
containers, shared infrastructure:

| App | Domain | Source |
|---|---|---|
| GrowClinic website (marketing site + CMS admin) | www.growclinic.io (apex redirects) | `apps/GrowClinic-main` (service `growclinic`) |
| Audit (AI audit tool + CRM) | audit.growclinic.io | `apps/audit` |
| GMB (Google Business Profile ops) | gmb.growclinic.io | `apps/gmb` |
| Engine (multi-tenant clinic CRM) | engine.growclinic.io | `apps/engine` |

Shared: one Nginx reverse proxy · **one PostgreSQL 17 database** (`growclinic`,
schemas `core/growclinic/audit/gmb/engine`) · one Redis 7.4 · one migration job.
All four apps were migrated from MySQL to PostgreSQL.

> The main website is **`apps/GrowClinic-main`** (the enhanced site). The older
> `apps/growclinic` site was retired on 2026-09-17 and archived outside this
> repository at `D:\Projects\GrowClinic-archive\growclinic-old-site-20260917`
> (its uncommitted `.env` and `public/uploads` included).

📐 [ARCHITECTURE.md](ARCHITECTURE.md) · 🗄️ [DATABASE-MIGRATION.md](DATABASE-MIGRATION.md) ·
🔌 [PORTS.md](PORTS.md) · 🔐 [SECURITY.md](SECURITY.md) · ✅ [TESTING.md](TESTING.md) ·
🚀 [DEPLOYMENT.md](DEPLOYMENT.md)

```
growclinic-platform/
├── docker-compose.yml        the platform (services, network, volumes, health checks)
├── compose.dbtools.yml       opt-in loopback ports for PostgreSQL/Redis GUIs
├── compose.local-https.yml   opt-in local HTTPS (mkcert) on 127.0.0.1:18443
├── compose.import.yml        one-off MySQL → PostgreSQL import
├── .env.example              all variables (platform + every app)
├── apps/{GrowClinic-main,audit,gmb,engine}/   application source + Dockerfile each
├── database/
│   ├── migrations/{core,audit,gmb}/      SQL migrations (Prisma apps: apps/*/prisma/migrations)
│   ├── privileges/                       grant overrides
│   ├── migrator/                         the migrate job
│   └── import/                           importer, fixtures, dumps/ (git-ignored)
├── proxy/                    nginx.conf, conf.d/<app>.conf, snippets/, optional/
├── redis/redis.conf
├── scripts/                  check-ports · generate-secrets · migrate · backup · restore · smoke-test
└── tests/audit-db.test.js
```

---

## Local setup

Prerequisites: Docker with Compose v2.17+ (Docker Desktop on Windows/macOS),
bash (Git Bash on Windows), `curl`, `openssl`. Node on the host is only needed
for `scripts/smoke-test.sh`. About 8 GB free disk for images.

```bash
# 1. Verify the local ports are free (never kills anything)
./scripts/check-ports.sh 18080

# 2. Create .env with fresh random secrets
./scripts/generate-secrets.sh
#    Optional: fill AUDIT_*/GMB_*/GROWCLINIC_* integration keys (AI, SMTP, WhatsApp, Google).
#    For local-only testing you may set GMB_OTP_TEST_MODE=on and GMB_USE_MOCK_GOOGLE_API=true.

# 3. Build and start (the migrate job creates the schema before the apps start)
docker compose build
docker compose up -d
docker compose ps            # all services "healthy", migrate "Exited (0)"

# 4. Admin users (one-off; set the *_SEED_ADMIN_PASSWORD values in .env first, 12+ chars)
docker compose --profile tools run --rm growclinic-seed
docker compose --profile tools run --rm engine-seed        # prints the first activation key once
#    Audit: log in as "admin" with AUDIT_ADMIN_INITIAL_PASSWORD (or see /data/.admin-password)

# 5. Optional end-to-end check (writes test rows to the LOCAL database)
./scripts/smoke-test.sh
```

### Local URLs

| URL | |
|---|---|
| http://growclinic.localhost:18080 | GrowClinic website · admin at `/admin/login` |
| http://audit.growclinic.localhost:18080 | Audit · admin at `/admin` |
| http://gmb.growclinic.localhost:18080 | GMB · app at `/app` |
| http://engine.growclinic.localhost:18080 | Engine · `/api/health`, `/embed.js` |

`*.localhost` resolves to 127.0.0.1 in Chrome, Edge, Firefox and curl without
any setup, and browsers treat it as a secure context (Secure admin cookies work
over http). **Fallback** `.local` names need a hosts entry
(`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):

```
127.0.0.1 growclinic.local
127.0.0.1 audit.growclinic.local
127.0.0.1 gmb.growclinic.local
127.0.0.1 engine.growclinic.local
```
…but `.local` over plain http is not a secure context, so Audit/GMB admin logins
there need the HTTPS override. GrowClinic's NextAuth redirects to
`GROWCLINIC_AUTH_URL` (default the `.localhost` name).

Optional local HTTPS (`https://*.growclinic.localhost:18443`):
```bash
mkdir -p proxy/certs
mkcert -cert-file proxy/certs/local.pem -key-file proxy/certs/local-key.pem \
  growclinic.localhost audit.growclinic.localhost gmb.growclinic.localhost engine.growclinic.localhost
./scripts/check-ports.sh 18443
docker compose -f docker-compose.yml -f compose.local-https.yml up -d
```

Optional DB tools on 127.0.0.1:15432 / 16379:
```bash
./scripts/check-ports.sh 15432 16379
docker compose -f docker-compose.yml -f compose.dbtools.yml up -d
# psql: host 127.0.0.1 port 15432 db growclinic user gc_admin (POSTGRES_SUPERUSER_PASSWORD)
# GrowClinic citext comparisons need: SET search_path = growclinic;
```

## Command reference

```bash
docker compose build                        # build all images
docker compose build growclinic             # one app
docker compose up -d                        # start / apply changes
docker compose ps                           # state + health
docker compose logs -f                      # all logs
docker compose logs -f growclinic
docker compose logs -f audit
docker compose logs -f gmb
docker compose logs -f engine
docker compose restart growclinic
docker compose restart audit
docker compose restart gmb
docker compose restart engine
docker compose down                         # stop + remove containers; DATA IS KEPT
```

Database and operations:
```bash
./scripts/migrate.sh status                 # pending/applied migrations (read-only)
./scripts/migrate.sh apply                  # apply (back up first in production)
./scripts/backup.sh                         # DB + roles + uploads + audit reports → ./backups/<UTC timestamp>/
./scripts/restore.sh backups/<ts>           # verify a backup in a scratch DB (non-destructive)
docker compose exec postgres pg_isready -U gc_admin -d growclinic
docker compose exec redis redis-cli ping
```

> ⚠️ **Destructive — never part of normal work:** `docker compose down -v`
> deletes the `postgres_data`, `redis_data`, `growclinic_uploads` and
> `audit_data` volumes, i.e. **all data**. Only use it on a disposable local
> environment, after `./scripts/backup.sh`, and only when you intend to wipe
> everything. `./scripts/restore.sh <dir> --replace-live` is the only
> destructive script and asks you to type the database name.

Schema changes:
- GrowClinic / Engine: edit `prisma/schema.prisma`, create a migration with
  `prisma migrate dev --create-only` against a **local scratch** database, commit
  `prisma/migrations/*`, then `./scripts/migrate.sh apply`.
- Audit / GMB: add `database/migrations/<app>/000N_description.sql` (never edit
  an applied file — the ledger checksum will stop the run), then
  `./scripts/migrate.sh apply`.

MySQL → PostgreSQL data import: [DATABASE-MIGRATION.md §8](DATABASE-MIGRATION.md#8-data-import-strategy).

## What changed per application (summary)

| App | Changes |
|---|---|
| growclinic (`apps/GrowClinic-main`) | Prisma provider → postgresql + baseline migration `20260917180000_init_postgresql` (14 tables); citext for login email, post/project/case-study slugs, tag names; `mode: "insensitive"` admin searches; ISR kept — build-time DB-less snapshots removed in the Dockerfile so pages render from the DB on first request; audit webhook + CRM push routed over the private network; `/api/health` is the container health check and scheduled-publish trigger; IndexNow switch (`INDEXNOW_ENABLED`); **security fixes:** server actions `deletePost/Testimonial/CaseStudy/ClientLogo` and `checkIntegrationStatus` had no auth (forged cookie was enough), `/api/clientlogos` POST/PATCH/DELETE had no auth, path traversal in `/api/uploads/[filename]`, client-controlled extension in `/api/upload`, Cal.com webhook default secret `"vamigo"` (now fails closed, constant-time compare); seed/create-admin require a 12+ char password and no longer print hashes; Dockerfile |
| audit | `db.js` rewritten for `pg` (same exported API and row shapes); schema moved to migrations; `cleanup_spam.js` ported (and its column names fixed); `leads.json` → persistent `DATA_DIR`; handoff tokens in Redis (memory fallback); `mysql2` → `pg`, `redis`; Dockerfile |
| gmb | pg helper keeping `:named` params; all route SQL ported; boot auto-migration removed; stack traces no longer returned; OAuth state nonce (CSRF fix); unified token encryption key derivation; handoff fails closed + Redis tokens; `mysql2` → `pg`, `redis`; MySQL schema kept in `db/mysql-legacy/`; Dockerfile |
| engine | Prisma 5.22 → 6.3.1 (exact) + lockfile + baseline migration; scrypt password library with legacy SHA-256 upgrade; seed hardened; private MySQL/Nginx/Certbot kit retired to `deploy/_superseded/`; Dockerfile |

## Known issues

1. **Engine has no login or admin UI** in the supplied code; its home page links
   to `/engine/login`, which returns 404. Clinics/keys are created with the seed
   or SQL for now.
2. **Audit → GMB caller doesn't exist:** GMB `/api/handoff` is ready (secret
   configured, tested) but nothing in the supplied Audit code calls it. The
   website → Audit calls (`/api/intake`, `/api/lead-magnet`) are wired and tested.
3. **External integrations untested locally** (no keys): Audit AI reports,
   WhatsApp/GetGabs, SMTP, Google Places/PageSpeed/Calendar, GMB Google OAuth and
   Places search, analytics APIs.
4. GrowClinic website ISR cache lives in the container filesystem: after a
   container is recreated each page is rendered once from the DB, then cached.
   404 pages keep their build-time render (no admin tracking scripts on 404s).
5. GrowClinic `next build` prints an NFT tracing warning caused by the existing
   `process.cwd()` join in the uploads route — harmless with `next start`.
   `next.config.ts` redirects `/our-projects` → `/projects`, but the website has
   no `/projects` page (404) — pre-existing; point it at `/case-studies` if intended.
6. Images are large (growclinic 1.29 GB, engine 1.21 GB) because they ship full
   production `node_modules`; Next.js standalone output could shrink them later.
7. Audit OTP codes and rate-limit windows, and GMB's Places cache, remain
   in-process memory: correct for one container per app, but must move to Redis
   before running an app with more than one replica.
8. GMB prototype logic: `edits.js` publishes placeholder values when none are
   supplied; `apps/gmb/dist/` is a stale committed build (ignored by the image).
9. The website's admin **Integrations** page checks the live public site
   (`https://www.growclinic.io`) and tracking providers from the server — locally
   it reports production's state, not the local stack's.
10. On Windows, run scripts from Git Bash; npm installs inside Docker are slow on
    constrained links (one GMB build needed a retry after a registry timeout).

## Required manual actions

1. **Commit the restructure.** The four apps now live in `apps/`; the root repo
   still tracks the retired old site's files at the top level (they show as
   deleted). `apps/GrowClinic-main`, `apps/audit`, `apps/gmb` and `apps/engine`
   were **not under version control** when they were modified — commit them
   (or compare against their GitHub originals) so the changes are reviewable
   and reversible.
2. **Rotate the credentials in the archived old-site `.env`**
   (`D:\Projects\GrowClinic-archive\growclinic-old-site-20260917\.env`) — it
   holds what appear to be production MySQL and API credentials on the
   development machine — and delete the archive once nothing in it is needed.
   **Also patch the live website now:** the production GrowClinic-main build has
   the unauthenticated delete server actions and client-logo API fixed here
   (see SECURITY.md) — anyone can delete posts, case studies, testimonials and
   client logos today.
3. Fill real integration keys in `.env` to test AI/WhatsApp/SMTP/Google locally.
4. Register the GMB OAuth redirect URIs in Google Cloud (local and production).
5. Configure the same `CAL_WEBHOOK_SECRET` in Cal.com (the webhook now rejects unsigned calls).
6. Decide whether Audit should call GMB's handoff (Known issue 2). Set the same
   `AUDIT_INTAKE_SECRET` / `AUDIT_INBOUND_LEADS_KEY` in production (the website
   receives them automatically) and `GROWCLINIC_INDEXNOW_ENABLED=true` there only.
7. Do a manual browser pass of the admin UIs (editors, uploads, GMB SPA).
8. Production: follow [DEPLOYMENT.md](DEPLOYMENT.md) — every production step
   needs explicit approval; start with the read-only preflight and a rehearsal
   of the data import on dump copies.
