# Engine CRM SaaS — VPS Deployment Runbook

Host the engine (headless CRM + lead-ingest API + admin) as a standalone SaaS at
**engine.growclinic.io** on the Hostinger **VPS** (`srv1780214`, `187.127.186.43`, Ubuntu 24.04, root).

The managed Cloud Startup hosting stays for the marketing websites. The VPS is the SaaS backend.

---

## 0. Prerequisites (one time)

- Access to the VPS (Hostinger → VPS → Web console, or SSH `root@187.127.186.43`).
- Access to Hostinger **DNS Manager** for `growclinic.io`.
- The engine code on the server (git clone or upload the repo).

> You control root and SSH. I never handle server passwords or keys — run these steps yourself.

---

## 1. DNS

In DNS Manager for `growclinic.io`, add:

| Type | Name     | Value             | TTL  |
|------|----------|-------------------|------|
| A    | `engine` | `187.127.186.43`  | 3600 |

Wait for it to resolve: `dig +short engine.growclinic.io` → should return the VPS IP.

---

## 2. Install Docker (if not already)

The VPS shows a **Docker Manager**, so Docker is available. If using the console:

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

---

## 3. Get the code + env onto the VPS

```bash
mkdir -p /opt && cd /opt
git clone <your-repo-url> engine   # or upload the project here
cd engine/deploy
cp .env.example .env
nano .env                          # fill DB_PASSWORD, SESSION_SECRET, ADMIN_* etc.
```

Generate the secrets locally or on the box:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"                 # SESSION_SECRET
node -e "console.log(require('crypto').createHash('sha256').update('YourPass').digest('hex'))"  # ADMIN_PASSWORD_HASH
```

---

## 4. First-time SSL bootstrap (chicken-and-egg)

The 443 block needs a cert that doesn't exist yet. Do this once:

```bash
cd /opt/engine/deploy

# 4a. Temporarily serve only HTTP so certbot can answer the challenge.
#     Comment out the entire `server { listen 443 ... }` block in nginx/engine.conf.
docker compose up -d db app nginx

# 4b. Issue the certificate (replace the email).
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d engine.growclinic.io --email you@growclinic.io --agree-tos --no-eff-email

# 4c. Restore the 443 block in nginx/engine.conf, then reload.
docker compose restart nginx
```

Auto-renewal runs via the `certbot` service loop in compose.

---

## 5. Launch everything

```bash
cd /opt/engine/deploy
docker compose up -d --build
docker compose ps          # all healthy?
docker compose logs -f app # watch first boot (prisma db push + next start)
```

Visit **https://engine.growclinic.io** → you should get the engine login.
The admin/CRM lives at `/engine/login` (and `/admin`), same as today.

---

## 6. Backups

You already have VPS Snapshots (2) + Malware scanner active. Add a nightly DB dump:

```bash
# /etc/cron.d/engine-db-backup  (runs 02:30 daily)
30 2 * * * root docker exec deploy-db-1 sh -c 'exec mysqldump -uengine -p"$MYSQL_PASSWORD" engine' > /opt/backups/engine-$(date +\%F).sql 2>/dev/null
```

Keep 14 days and copy off-server (patient/lead PII — see DPDP note in SAAS-ARCHITECTURE.md).

---

## 7. Updating the engine

```bash
cd /opt/engine && git pull
cd deploy && docker compose up -d --build app
```

---

## 8. Connect a website (Webflow / WordPress / coded)

Once the ingest API + activation key are built (see SAAS-ARCHITECTURE.md), each clinic gets:

1. An **activation key** from the platform admin.
2. A paste-in embed snippet:

```html
<script src="https://engine.growclinic.io/embed.js" data-key="CLINIC_ACTIVATION_KEY" defer></script>
```

- **Webflow / WordPress / coded** — paste in the site `<head>` (or a form-embed block). The snippet captures form submits and posts them to the engine.
- **Native form webhook** — point Webflow Forms / WPForms / CF7 webhook at
  `https://engine.growclinic.io/api/ingest/lead` with the key header.

Leads land in that clinic's isolated CRM. Nothing else on their site changes.

---

## What's in this folder

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds the Next.js engine image (with Prisma) |
| `docker-compose.yml` | app + MySQL + Nginx + Certbot |
| `nginx/engine.conf` | TLS termination + reverse proxy |
| `.env.example` | Server environment template |
| `SAAS-ARCHITECTURE.md` | Multi-tenant model: activation keys, Free/Pro, data isolation, ingest API |
