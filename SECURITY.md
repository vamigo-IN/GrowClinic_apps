# Security report — GrowClinic platform

Scope: infrastructure hardening introduced by the platform, security defects
found in the four codebases during migration (fixed or documented), and the
residual risks. Every "verified" item was exercised against the running local
stack (see TESTING.md).

## 1. Platform controls

| Control | Implementation | Verified |
|---|---|---|
| Minimal exposure | Only the proxy publishes a port, bound to `127.0.0.1`. PostgreSQL, Redis and apps are unpublished. Production: TLS stays on the existing VPS Nginx. | ✔ `PortBindings {}` for postgres/redis/apps |
| Private network | Single bridge network; service names only; no `localhost` DB traffic | ✔ |
| Non-root apps | All app images run as `node`; `cap_drop: ALL` (effective caps 0); `no-new-privileges` on every service | ✔ `CapEff 0000000000000000` |
| Database least privilege | Per-app runtime role: DML on own schema only; no DDL/TRUNCATE; no cross-schema access; per-role connection caps; `REVOKE ALL ON DATABASE … FROM PUBLIC`; `public` schema closed | ✔ cross-schema read, CREATE, DROP, CREATE SCHEMA all denied |
| Tenant data separation | Engine's patient leads live in `engine`, unreadable by audit/gmb/growclinic roles | ✔ |
| Append-only audit trail | `gmb_app` has no UPDATE/DELETE/TRUNCATE on `gmb.audit_events` | ✔ DELETE denied, INSERT allowed |
| Migration history protected | app roles have no rights on `_prisma_migrations` | ✔ |
| Controlled schema changes | Apps never run DDL; one migrate job with advisory lock, checksummed forward-only ledger; `check` mode for production | ✔ edited-file/idempotency/check-mode tests |
| Secrets | Only in `.env` (git-ignored, generated with 48-hex random values, mode 600) → per-service `environment:`; each container receives only its own secrets; no secrets in images (`.dockerignore` excludes `.env*`, `settings.json`, uploads, reports); DB/Redis passwords validated as URL-safe ≥24 chars | ✔ |
| Password storage (DB) | `scram-sha-256` (`password_encryption`, `--auth-host=scram-sha-256`) | ✔ |
| Redis isolation | ACL user per app, key-prefix confinement (`audit:*`, `gmb:*`), no `@dangerous` commands, default user PING-only | ✔ NOPERM on foreign keys and FLUSHALL |
| Real client IP | `real_ip` trusting private ranges only + single normalised `X-Forwarded-For`; prepended spoofed hops ignored | ✔ IP recorded = real client, limiter isolates clients |
| Rate limiting | Nginx: NextAuth credentials (10 r/min), GrowClinic public forms (30 r/min), Engine ingest (120 r/min); apps keep their own limiters | ✔ 429 observed |
| Headers | nosniff, Referrer-Policy, XFO SAMEORIGIN, Permissions-Policy (growclinic/gmb/engine); Audit's own CSP/XFO/HSTS untouched and not duplicated; `server_tokens off`; `X-Powered-By` hidden | ✔ |
| Log hygiene | JSON access log records `$uri` without query strings (tokens/keys in `?key=`, `?code=`, `?t=` never logged); Docker log rotation 10 MB × 5 | ✔ |
| Unknown hosts | `444` | ✔ |
| Backups | `pg_dump` + globals + volume tarballs with checksums; restore verification path is non-destructive by default | ✔ |

## 2. Defects fixed during the migration

| # | Severity | App | Issue | Fix | Verified |
|---|---|---|---|---|---|
| 1 | **Critical** | growclinic | **Path traversal / arbitrary file read** in `GET /api/uploads/[filename]`: the decoded URL segment was joined into a filesystem path, so `%2E%2E%2F%2E%2E%2Fproc%2Fself%2Fenviron` would have returned `/proc/self/environ` (DB URL, AUTH_SECRET, SMTP/WhatsApp tokens) or `/etc/passwd`. Confirmed the decoded `../` reaches the handler. | Only plain base names are served (`filename === basename(filename)`, no leading dot or backslash); otherwise 404. | ✔ 3 traversal variants → 400/404, no content |
| 2 | High | gmb | **OAuth CSRF / account binding**: `state` was unsigned base64 `{orgId,userId}`; a forged callback could attach an attacker's Google account to any organisation. | One-time nonce in an HttpOnly `gmb_oauth_state` cookie embedded in state; callback requires nonce match, signed-in user = state user, and active clinic_admin membership. | ✔ forged state → 400 |
| 3 | High | growclinic | Cal.com webhook fell back to the secret `"vamigo"` (in source) when `CAL_WEBHOOK_SECRET` was unset → forgeable bookings; signature compared with `===`. | Fails closed (503) without a secret; constant-time comparison. | ✔ valid 201 / invalid 401 |
| 4 | High | engine | Passwords stored as unsalted SHA-256. | scrypt with per-password salt; legacy hashes verify and are upgraded (no lockout). | ✔ see DATABASE-MIGRATION.md §12 |
| 5 | Medium | gmb | 500 responses returned `error.message` **and stack traces** (paths, SQL) to clients. | Generic message in production; details only outside production. | ✔ DB outage → `{"error":"Internal error"}` |
| 6 | Medium | gmb | `POST /api/handoff` accepted HMACs made with the public fallback key `"dummy-handoff-key"`. | Fails closed (503) unless `INBOUND_HANDOFF_KEY` (16+ chars) is set. | ✔ good sig 200, bad 403 |
| 7 | Medium | gmb | Token-encryption key derivation duplicated three times and inconsistent (`edits.js` could never decrypt tokens stored by `google.js`). | Single `lib/tokenCrypto.js` using the exact derivation used to encrypt stored tokens (no re-encryption needed); warning when no key is configured. | code review |
| 8 | Medium | growclinic, engine | Seed scripts fell back to known passwords (`admin123`, `change-me-now`); GrowClinic seed printed the password hash. | Seeds require a 12+ char password from env; only id/email/name printed. | ✔ |
| 9 | Medium | growclinic | NextAuth credentials endpoint had no brute-force throttling. | Nginx `limit_req` (10 r/min per IP, burst 5). | ✔ 429 |
| 10 | Medium | audit, gmb | Behind two proxies all clients would share one IP (rate limits/lockouts global, IP logs useless). | real_ip + single forwarded address. | ✔ |
| 11 | Low | growclinic | NextAuth route-handler redirects used the container address (`0.0.0.0:3000`). | `AUTH_URL` set per environment. | ✔ |
| 12 | Low | audit | `leads.json` (chat transcripts with PII) written into the code directory. | Written to the `audit_data` volume. | ✔ |
| 13 | Low | engine | Private kit published 80/443 and ran `prisma db push` on every start (schema drift/data-loss risk). | Retired (`deploy/_superseded/`); migrations only via migrate job. | ✔ |

## 3. Preserved mechanisms (unchanged behaviour)

GrowClinic NextAuth JWT sessions + `proxy.ts` admin gate + bcrypt; Audit scrypt,
RBAC, per-user TOTP, login lockout, maintenance bypass, `INTAKE_SECRET`,
`CRM_API_KEY`, `INBOUND_LEADS_KEY`, SSRF guard, CSP, admin cookie
HttpOnly/SameSite=Strict/Secure; GMB OTP hashing, per-phone caps, org-scoped
queries, RBAC; Engine activation-key hashing, origin allow-list, plan caps,
per-clinic scoping. Verified in the smoke suite (auth, 401/403 paths, tenant
isolation for GMB orgs and Engine clinics, CORS, key/origin rejection,
suspended clinic, FREE-plan cap).

**Multi-tenancy review (Engine).** Every query path touching Clinic/User/Lead/
ActivationKey was reviewed: the ingest route resolves the clinic only from the
hashed key and writes `clinicId` from the key record; counts and updates are
scoped by that `clinicId`/key id. No other data paths exist yet. Isolation is
unchanged by the migration and additionally backed by schema-level role
separation.

## 4. Residual risks and recommendations

| Risk | Recommendation |
|---|---|
| Engine has no authentication/admin UI yet; README/home page link to `/engine/login`, which 404s. | When building login: use `verifyPassword`/`hashPassword` (rehash on `needsRehash`), HttpOnly Secure cookies, `SESSION_SECRET`, rate limiting, and enforce `clinicId` from the session on every query. |
| Engine ingest: an **empty** `allowedOrigins` allows any origin; server-to-server calls without an `Origin` header are rejected when an allow-list exists (despite the comment suggesting header auth for servers). | Decide the intended server-to-server policy; forbid empty allow-lists in the future admin UI. |
| GMB `OTP_TEST_MODE=on` returns OTP codes in API responses (enabled locally for testing). | Never set in production (documented in `.env.example`). |
| GMB `edits.js` publishes placeholder values (`1234567890`, `https://example.com`) to Google when no value is supplied. | Business-logic bug in the prototype; require an explicit value before publishing. |
| GMB/Audit handoff endpoints have no callers yet. | Wire the callers with server-side HMAC/secrets only; never expose keys to browsers. |
| Audit CSP allows `'unsafe-inline'` (documented trade-off in the app). | Nonce-based CSP if the inline-script architecture changes. |
| GrowClinic admin-editable header/footer scripts are injected unsanitised (stored XSS by design for tracking tags). | Restrict the settings page to trusted admins; consider an allow-list of tag types. |
| GrowClinic `PATCH /api/projects/[id]` passes the request body straight to Prisma (mass assignment, admin-only). | Whitelist fields. |
| `X-Forwarded-*` trust: on the VPS, anything that can reach `127.0.0.1:<port>` can set forwarded headers. | Keep the loopback binding; don't run untrusted local processes on the VPS. |
| Secrets in env are visible to anyone with Docker access on the host. | Restrict Docker group membership; consider Docker secrets/SOPS later. |
| `globals.sql` in backups contains role password hashes. | Encrypt backups at rest and in transit off-site. |
| `apps/growclinic/.env` (pre-existing, local) contains what appear to be **production** DB credentials and API tokens. | Excluded from every image and from git; rotate those credentials when production moves, and delete the file once no longer needed. |
