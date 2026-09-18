# Production migration, VPS deployment and rollback plan

> **Status: plan only. Nothing in this document has been executed.** The
> platform has been built and validated locally (TESTING.md). No SSH session,
> VPS change, DNS change, production database or production credential was
> used. Each production step below requires an explicit go-ahead.

Target host: the existing Hostinger VPS. Its Nginx keeps ports **80/443** and
TLS; the platform proxy binds one **verified** loopback port.

---

## 0. Guardrails (apply to every step)

- Read-only first: every VPS step starts with inspection commands; nothing is
  stopped, restarted or removed that belongs to existing services.
- Never bind: 22, 80, 443, 3000, 3001, 3050, 5001, 5050, 5432, 5433, 5678,
  6379, 8087, 8090, 8091, 65529 — nor any port `ss` shows in use at that moment.
- Never run `docker compose down -v`, `prisma db push`, `prisma migrate reset`,
  `DROP DATABASE` against production, or the importer with `--allow-non-empty`.
- Always `./scripts/backup.sh` before `./scripts/migrate.sh apply` and before
  any cut-over step that writes data.
- Keep the old Hostinger apps and MySQL databases intact until sign-off (≥ 30 days).

## 1. Preparation (off the VPS, days before)

1. **Rehearse the data migration** on a secured workstation/staging host with
   copies of the production dumps (DATABASE-MIGRATION.md §7–§9). Record import
   output, zero-date/orphan reports and validation results. Fix any source
   issue in the rehearsal, not during the window.
2. **Time zones:** on each MySQL source run
   `SELECT @@global.time_zone, @@system_time_zone, NOW(), UTC_TIMESTAMP();`
   and set `IMPORT_AUDIT_SOURCE_TZ` / `IMPORT_GMB_SOURCE_TZ` accordingly.
3. **Secrets inventory** (fill the production `.env`, never commit):
   - fresh: all `CHANGE_ME` values (`./scripts/generate-secrets.sh` on the VPS),
   - carried over: `GROWCLINIC_AUTH_SECRET` (keeps existing admin sessions valid — optional),
     `GROWCLINIC_CAL_WEBHOOK_SECRET` (must equal the value configured in Cal.com),
     `AUDIT_INTAKE_SECRET` / `AUDIT_INBOUND_LEADS_KEY` (the platform passes them to the website
     automatically; only external callers of the audit tool need the same values),
     `GMB_TOKEN_ENC_KEY` / `GMB_JWT_SECRET` (**must** match the old GMB env, else stored Google tokens can't be decrypted),
     SMTP/WhatsApp/Google/OpenAI/Gemini keys (Audit keys also live in `audit.settings` and arrive with the import).
4. **Production URLs in `.env`:**
   ```
   GROWCLINIC_AUTH_URL=https://www.growclinic.io       # www is canonical; the apex 301-redirects
   GROWCLINIC_PUBLIC_URL=https://www.growclinic.io
   GROWCLINIC_INDEXNOW_ENABLED=true                     # production only
   AUDIT_PUBLIC_ORIGIN=https://audit.growclinic.io      # add https://www.growclinic.io if the site calls the tool from the browser
   AUDIT_PUBLIC_URL=https://audit.growclinic.io
   GMB_GOOGLE_REDIRECT_URI=https://gmb.growclinic.io/api/google/callback   # register in Google Cloud
   MIGRATE_MODE=check
   GMB_OTP_TEST_MODE=            # must be empty
   GMB_USE_MOCK_GOOGLE_API=      # must be empty
   AUDIT_ADMIN_DISABLE_2FA=      # must be empty
   ```
   `./scripts/preflight.sh` checks all of the above (plus secret lengths, URL-safe DB
   passwords, `.env` mode 600, loopback binding and a free, non-reserved port) and exits
   non-zero while anything is unsafe. It is read-only.
5. **DNS:** lower the TTL of `growclinic.io`, `www`, `audit`, `gmb`, `engine` to
   300 s at least 24 h before the window.
6. **Certificates:** decide per domain — (a) issue with the VPS's existing
   certbot using DNS-01 before the switch, or (b) HTTP-01 right after the DNS
   switch (brief HTTP-only period), or (c) reuse existing certs if the VPS
   already serves that name (e.g. engine).
7. **Images:** build on the VPS outside the window (`docker compose build`
   needs ~2 GB free RAM for the Next.js builds and ~5 GB disk), or build in CI
   and pull. Record image digests.

## 2. VPS preflight (read-only)

```bash
sudo ss -lntup                                   # save the output in the deployment log
free -h && df -h / /var/lib/docker
docker version && docker compose version
docker compose ls                                # no existing project named "growclinic"
docker network ls | grep -w growclinic-network   # must be empty
docker volume ls | grep '^growclinic_'           # must be empty
sudo nginx -t                                    # current config is valid before we add to it
```

Choose the platform port:
```bash
./scripts/check-ports.sh 18080     # after cloning; exit 0 = free and not reserved
sudo lsof -i :18080                # second opinion; empty = free
```
If taken, pick another high port (e.g. 18180, 28080), verify identically, and
record it. Set `PROXY_HTTP_BIND=127.0.0.1:<port>`.

## 3. VPS deployment plan

```bash
sudo mkdir -p /opt/growclinic-platform && sudo chown "$USER" /opt/growclinic-platform
git clone <platform-repo> /opt/growclinic-platform && cd /opt/growclinic-platform
./scripts/generate-secrets.sh          # then edit .env with §1.3/§1.4 values; chmod 600 .env
./scripts/preflight.sh                 # must end with "✅ ready" (checks ports, secrets, switches, URLs, compose)
docker compose build
docker compose up -d postgres redis
./scripts/migrate.sh apply             # empty DB: creates roles, schemas, tables
```

Do **not** start the apps yet (they seed rows at boot, and the importer only
fills empty tables).

## 4. Cut-over (maintenance window)

**T-0 Freeze writes on the old system**
- Audit: Admin → Maintenance ON (staff bypass code keeps admin reachable).
- GrowClinic/GMB/Engine: announce a short freeze; stop admin edits; optionally
  put the Hostinger apps behind a maintenance page.

**T+5 Dump sources** (from a host allowed to reach the MySQL servers):
```bash
mysqldump --single-transaction --quick --no-tablespaces --routines --triggers \
  --default-character-set=utf8mb4 -h <host> -u <user> -p <db> > growclinic.dump.sql   # likewise audit, gmb, engine
sha256sum *.dump.sql > DUMPS.sha256
```
Transfer to `/opt/growclinic-platform/database/import/dumps/` (scp over SSH;
the directory is git-ignored). Verify checksums.

**T+15 Import and validate**
```bash
docker compose -f docker-compose.yml -f compose.import.yml --profile import up -d import-mysql
docker compose -f docker-compose.yml -f compose.import.yml --profile import run --rm import import
docker compose -f docker-compose.yml -f compose.import.yml --profile import run --rm import validate
docker compose -f docker-compose.yml -f compose.import.yml --profile import rm -sf import-mysql
```
Go/no-go: every table `✔`, orphan and zero-date reports match the rehearsal.

**T+25 Files**
```bash
# GrowClinic uploads (from the old UPLOAD_DIR or public/uploads)
docker run --rm -v growclinic_growclinic_uploads:/target -v /path/to/old/uploads:/src:ro alpine:3.20 \
  sh -c 'cp -a /src/. /target/ && chown -R 1000:1000 /target'
# Audit reports + leads.json (+ .admin-password if used)
docker run --rm -v growclinic_audit_data:/target -v /path/to/old/audit-data:/src:ro alpine:3.20 \
  sh -c 'mkdir -p /target/reports && cp -a /src/reports/. /target/reports/ && cp -a /src/leads.json /target/ 2>/dev/null; chown -R 1000:1000 /target'
```

**T+30 Start and verify internally (no public traffic yet)**
```bash
./scripts/backup.sh                     # first backup of the migrated data
docker compose up -d                    # MIGRATE_MODE=check → apps start only if schema is current
docker compose ps
P=18080   # the verified port
for h in www.growclinic.io audit.growclinic.io gmb.growclinic.io engine.growclinic.io; do
  curl -s -o /dev/null -w "$h %{http_code}\n" -H "Host: $h" -H "X-Forwarded-Proto: https" http://127.0.0.1:$P/
done
curl -s -H "Host: engine.growclinic.io" http://127.0.0.1:$P/api/health
```
Read-only checks only (the smoke suite writes test rows — don't run it on production).

**T+40 VPS Nginx** — add one server block per domain (template in
ARCHITECTURE.md §13) in a **new** file, e.g.
`/etc/nginx/sites-available/growclinic-platform.conf`:
```bash
sudo nginx -t && sudo systemctl reload nginx     # reload, not restart; abort if -t fails
```
For names currently served elsewhere, the block only takes effect once DNS
points at the VPS. Keep `X-Forwarded-For $proxy_add_x_forwarded_for`,
`X-Forwarded-Proto https`, `Host $host`, `proxy_read_timeout 300s`,
`client_max_body_size 12m`, and add HSTS (`Strict-Transport-Security: max-age=31536000`)
on www/gmb/engine (audit sends its own).

**T+45 DNS switch** — A records for `growclinic.io`, `www`, `audit`, `gmb`,
`engine` → VPS IP. Issue/attach certificates as decided in §1.6.

**T+60 Verification in a browser**
- www.growclinic.io: home, blog post, sitemap.xml, robots.txt, admin login, edit a draft, image upload; `growclinic.io` → 301 to www.
- audit: public chat loads, admin login with 2FA, leads list shows imported data, one report link opens.
- gmb: SPA loads, OTP login for an existing user, locations list; Google connect redirect URI accepted.
- engine: `/api/health`, `embed.js`, a test lead from an allowed test origin (then delete it).
- Cal.com test webhook → 201; Audit Maintenance OFF.

## 5. After cut-over

- Cron (root or deploy user):
  ```
  30 2 * * * cd /opt/growclinic-platform && BACKUP_DIR=/opt/backups/growclinic ./scripts/backup.sh >> /var/log/growclinic-backup.log 2>&1
  ```
  plus off-site copy (rclone/rsync to object storage) and a weekly
  `./scripts/restore.sh <latest>` verification.
- Ensure Docker starts on boot (`systemctl is-enabled docker`); containers use
  `restart: unless-stopped`.
- Monitor: `docker compose ps`, `docker compose logs --since 1h`, disk usage of
  `/var/lib/docker`, `pg_stat_activity` counts.
- Import follow-ups: resolve reported orphans, then
  `import validate --validate-constraints`; remove dumps from the VPS.
- Rotate the old MySQL passwords and any credential that sat in the retired
  site's `.env` (archived at `D:\Projects\GrowClinic-archive\growclinic-old-site-20260917`);
  later decommission the Hostinger apps and databases.
- Future schema changes: backup → `./scripts/migrate.sh apply` → `docker compose up -d`.

## 6. Rollback plan

| Trigger | Action |
|---|---|
| Import validation fails, or internal verification (T+30) fails | Stop here. Nothing public changed. Old system: Maintenance OFF. Investigate; re-run on a fresh volume (`docker compose rm -sf` the apps, drop/recreate only the **new** platform's volumes after confirming they hold no production writes). |
| Nginx config test fails | Do not reload; remove the new file; `sudo nginx -t` must pass again. Existing sites were never affected. |
| Problems after DNS switch, within the window | Revert DNS records (TTL 300 s) to the old targets; take old apps out of maintenance. Export any rows written on the new platform during the window (`created/updated after <T+45>`) and replay them manually. |
| Problems discovered later (days) | Prefer forward fixes. For data corruption: `./scripts/restore.sh /opt/backups/growclinic/<pre-incident> --replace-live`. Returning to MySQL requires re-exporting new data manually — this is why the old databases and dumps are retained for the sign-off period. |
| Bad schema migration | Migrations are forward-only: ship a corrective migration, or restore the backup taken before `migrate.sh apply`. |
| Platform-level failure (host) | Rebuild on another host from git + latest off-site backup: `migrate.sh apply` on an empty volume is **not** needed after a full restore — use `restore.sh --replace-live`, which re-runs the migrate job for roles/grants. |

Rollback never includes deleting old Hostinger data, stopping unrelated VPS
services, or touching ports/containers that are not part of this project.
