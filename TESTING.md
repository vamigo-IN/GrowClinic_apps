# Testing report — local validation (2026-09-17, re-validated 2026-09-18)

Environment: Windows 11 + Docker Desktop 29.6.2 (Compose v5.3.1), 16 CPUs /
7.6 GB RAM for the Docker VM. Node 22.23.2, PostgreSQL 17.11, Redis 7.4,
Nginx 1.28.3. **No production system, credential or database was used.**

## 1. Build and start-up

| Step | Result |
|---|---|
| `./scripts/check-ports.sh 18080 18443 15432 16379` | all free; production ports (e.g. 5432) refused by the script; detection verified against occupied ports 135/445 |
| `docker compose config` (+ dbtools, local-https, import overrides) | valid |
| `docker compose --profile tools build` | all images built (GMB needed one retry: npm registry idle timeout on a slow link, not a code issue) |
| `docker compose up -d` | postgres, redis healthy → migrate exited 0 → growclinic, audit, gmb, engine, reverse-proxy **all healthy** |
| `docker compose ps` | only `reverse-proxy` publishes a port: `127.0.0.1:18080->80/tcp` |
| GrowClinic `next build` | all routes compile; root layout/sitemap dynamic (no DB needed at build) |
| Engine `next build`, GMB `vite build` | OK |

Issues found and fixed during testing: duplicate `proxy_read_timeout` in Nginx;
the optional HTTPS config mounted into a read-only `conf.d`; NextAuth
route-handler redirects to `0.0.0.0:3000` (→ `AUTH_URL`); Windows Git Bash path
handling in `backup.sh`/`restore.sh`; a reserved word (`sensitive`) in a MySQL
fixture.

## 2. Migrations (`database/migrator`)

| Test | Result |
|---|---|
| Fresh database: roles, core/audit/gmb SQL, Prisma growclinic + engine, ownership, grants | ✔ |
| Second `apply` | ✔ no changes ("No pending migrations") |
| `status` on migrated DB | ✔ exit 0 |
| `check` on an empty database | ✔ exit 1, lists 5 pending sets (apps would not start) |
| Object ownership | ✔ audit 18 tables → audit_owner, gmb 16 → gmb_owner, growclinic 12 → growclinic_owner, engine 9 objects → engine_owner |
| SQL validated separately in a throwaway PostgreSQL | ✔ |

## 3. Database privileges

| Attempt | Expected | Result |
|---|---|---|
| `audit_app` CREATE TABLE / DROP TABLE | denied | ✔ |
| `audit_app` SELECT `engine."Lead"` | denied | ✔ |
| `gmb_app` SELECT `audit.settings` | denied | ✔ |
| `gmb_app` DELETE `gmb.audit_events` / INSERT | denied / allowed | ✔ |
| `growclinic_app` SELECT `_prisma_migrations` | denied | ✔ |
| `engine_app` CREATE SCHEMA / table in `public` | denied | ✔ |
| Role connection limits | 10/12/10/10 | ✔ |

## 4. Audit data layer — `tests/audit-db.test.js` (as `audit_app`)

**19/19 groups passed**: init (schema check, settings cache, admin bootstrap),
settings upsert/delete, leads + phone lookup, chat tracking (upsert, flags,
E.164), case-insensitive search + totals, users (case-insensitive username,
duplicate rejection, roles, TOTP, password), invites (case-insensitive token,
refresh, accept), sessions (validation, disabled user, lockout counting), CRM
(legacy stage mapping, UTC follow-up strings, deal value, remarks, AI summary,
owner, gcal id, stale leads), tasks (due/overdue views) + timeline, insights/
counts/stats (numeric types, day buckets), automation rules/runs, raw events
stats, admin logs, popup leads + promote, API usage (day/week `IYYY-"W"IW`/month
buckets, provider health, keys), failed CRM queue, workspace (XP idempotency,
check-in upsert, streak, attendance, profile `joinDate`, stats), notification
prefs (upsert, matrix, recipients), purge/delete paths and FK cascades.

## 5. End-to-end — `scripts/smoke-test.sh` (through the proxy)

**185/185 checks passed** (re-run 2026-09-18 after a full `docker compose
--profile tools build`). Two harness bugs were fixed to get there, both in the
test rather than the apps:

- the GTM check wrote `GTM-SMOKE<epoch>` (15 chars), which `safeGtmId()`
  correctly drops — only `/^GTM-[A-Z0-9]{4,12}$/i` is ever rendered into an
  inline script, so the id is now generated inside that format;
- the Places check asserted the configured-off 503 unconditionally; it now
  asserts 200 when `GMB_GOOGLE_PLACES_API_KEY` is set and 503 when it is not.

The suite is not safely re-runnable inside 10 minutes: GMB caps `/otp/request`
at 10 per IP per 10 min (in-memory) and one run spends 6 — `docker compose
restart gmb` resets it. Highlights:

- **Platform:** proxy health; unknown Host refused; all services healthy;
  postgres/redis/apps unpublished; exactly one database with the five schemas.
- **growclinic.io:** homepage + 9 public pages; canonical/OG keep
  `https://growclinic.io`; robots.txt and DB-generated sitemap.xml; proxy
  security headers; no `X-Powered-By`; `/admin` redirects to login on the
  public origin; NextAuth login with an **upper-cased** email (citext);
  dashboard; DB writes via `/api/contact`, `/api/bookings`, `/api/leads`,
  `/api/audit`; case-insensitive admin searches; 401 without session; post
  creation, differently-cased tag reuse and case-insensitive slug uniqueness;
  published post page; image upload → volume → served back → library;
  **3 path-traversal variants blocked**; Cal.com webhook valid HMAC 201 / bad
  401; NextAuth brute force rate-limited (429).
- **audit.growclinic.io:** homepage; `/api/health`; app CSP not duplicated;
  admin UI; login with upper-cased username; cookie HttpOnly + SameSite=Strict +
  Secure; 17 admin API endpoints (stats, overview, chats, team, users, logs,
  usage, popup leads, tasks, automations, source report, integration
  health/queue, notification prefs, workspace, marketing) → 200; 401 without
  session; visit tracking; lead capture; CRM prospect create + update; CRM API
  with X-API-Key (and wrong key 401); site→audit intake with `INTAKE_SECRET`
  (wrong secret 401); handoff token stored under `audit:*` in Redis, **survives
  an audit container restart**, single-use; Redis ACL denies foreign keys and
  FLUSHALL; reports directory writable on the volume; per-client rate limit
  works through both proxies and does not affect another client IP.
- **gmb.growclinic.io:** SPA index, client-route fallback, missing asset 404,
  unknown API JSON 404; OTP request/wrong code/verify with HttpOnly session;
  **real client IP stored** despite a spoofed hop; `/me`; org + location create;
  PATCH updates `updatedAt` (trigger); list; score report; malformed id → 404;
  members; 401 without session; **tenant isolation** (other org cannot read,
  read org, or modify); Google connect redirect with state; **forged OAuth state
  rejected**; audit→gmb HMAC handoff, redeemed from Redis, single-use, bad
  signature 403; public audit search (200 with a Places key configured, 503
  configured-off without one); per-phone OTP cap → 429.
- **engine.growclinic.io:** homepage (noindex); `/api/health` DB up; embed.js
  CORS; preflight 204; ingest with valid key + allowed origin; leaked key from
  another origin 403; invalid key 401; missing contact 422; header-key ingest
  for a second tenant; **each lead stored under its own clinicId only**;
  `lastUsedAt`; FREE plan monthly cap → 402; suspended clinic → 403.

## 6. MySQL → PostgreSQL import (fixtures)

Throwaway MySQL 8.4 loaded with the original MySQL DDL of all four apps and
edge-case rows; imported into a freshly migrated scratch database.

- Import: 4 apps committed, 49 tables; zero-date reported and converted to NULL.
- Validate: **every table's row count and primary-key digest matched**; planted
  orphans (`xp_ledger` → missing user, `lead_events` → deleted lead) preserved
  and reported; NOT VALID constraints listed.
- Re-import into non-empty tables: refused, rolled back.
- Value checks: citext lookup; millisecond precision; emoji/Devanagari/accents;
  smallint 0/1 flags; UTC follow-up time; remarks JSON; `joinDate`; identity
  sequence continues after max id; bigint epoch; GMB boolean, numeric
  lat/lng/rating, jsonb, ms timestamps; Engine enums; activation-key hash
  matches its plaintext.
- Audit data layer on imported rows: original string/number shapes;
  case-insensitive username; funnel metrics; new ids continue.
- Engine legacy SHA-256 password: wrong seed password → untouched; correct →
  upgraded to scrypt; library verifies scrypt and legacy hashes, salts differ.

## 7. Resilience, persistence, operations

| Test | Result |
|---|---|
| `docker compose down` → `up` (no `-v`) | ✔ DB rows, uploaded image, audit report file, Redis key, `.admin-password` (0600) all retained |
| PostgreSQL stopped while apps run | Engine health 503, GMB/GrowClinic generic 500s (no stack traces), Audit health up |
| PostgreSQL restarted | ✔ all four apps recovered **without restarts** |
| `scripts/backup.sh` | ✔ dump (378 TOC entries verified), globals, both volume tarballs, checksums |
| `scripts/restore.sh <dir>` (verify mode) | ✔ restored into scratch DB, row counts printed, live DB untouched |
| `compose.local-https.yml` (self-signed cert) | ✔ all four hosts 200 over TLS on 127.0.0.1:18443; Secure admin cookie issued; reverted to HTTP-only afterwards |
| Engine / GrowClinic seed tools (`--profile tools`) | ✔ scrypt admin created; bcrypt admin created; no default passwords |
| Container hardening | ✔ apps run as `node`, CapEff 0, no-new-privileges, log rotation 10 m × 5 |
| Idle footprint | ≈ 245 MB RAM for the seven long-running containers |

## 8. Cleaning up after a run

`scripts/smoke-clean.sh` removes what the suites write to the local database
(`--dry-run` reports without deleting). It matches only the fixtures — `Smoke …`,
`Handoff Clinic …`, `Intake …`, `*@example.com`, engine `qa_*` tenants, GMB smoke
orgs and OTP phones — and leaves seeded blog posts and the seeded admin alone.
It carries the same loopback guard as the smoke test, so it cannot be pointed at
production. The 2026-09-18 run cleared 799 rows across the four schemas; the 13
orphaned upload files the upload checks leave in the `growclinic_uploads` volume
are not covered and were removed separately.

## 9. Not tested (and why)

| Area | Reason / how to test |
|---|---|
| Audit AI report generation (Gemini/OpenAI/PageSpeed/Places) | needs real API keys; set `AUDIT_*` keys locally and run a chat to completion |
| WhatsApp (GetGabs/Meta), SMTP, Telegram, Google Calendar, GA4/Meta analytics | external accounts; verify in staging with test numbers/inboxes |
| Real Google Business Profile OAuth + Places search | needs Google Cloud credentials and a registered redirect URI |
| Real production data import | forbidden locally by design; run §8 of DATABASE-MIGRATION.md on a staging copy |
| Browser UI click-through (admin editors, TipTap, GMB SPA flows) | curl-level tests cover the APIs; do a manual browser pass at `http://*.growclinic.localhost:18080` |
| Load / soak testing | not in scope; watch `pg_stat_activity` and `docker stats` under expected traffic |
| Production VPS | out of scope for this phase — DEPLOYMENT.md |
