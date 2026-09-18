# GrowClinic AI — Audit Assistant

> **Platform note (2026-09):** this app now runs as the `audit` service of the
> GrowClinic Docker platform (repository root `docker-compose.yml`) on
> **PostgreSQL** (schema `audit`, via `pg`) with the shared Redis. MySQL,
> `mysql2`, `MYSQL_*` and the boot-time `CREATE/ALTER TABLE` logic are gone —
> the schema lives in `database/migrations/audit/`. Hostinger/MySQL notes below
> are historical. See the root `README.md`, `ARCHITECTURE.md` and
> `DATABASE-MIGRATION.md`.

A WhatsApp-style conversational tool that runs a ~150-second digital audit of any clinic, hospital, or specialty practice. It collects the practice details, confirms the live Google Business Profile, scores the website (PageSpeed), and generates a personalised, benchmarked growth report with a 90-day plan. The full report unlocks only after the lead verifies their WhatsApp number — so every completed audit is a verified, contactable lead.

Powered by:
- **Google Gemini** (`gemini-2.5-flash`) — chat conversation + lead extraction
- **OpenAI** (`gpt-4o-mini`) — final report writing + fallback
- **Google Places API** — Google Business Profile lookup
- **Google PageSpeed Insights API** — website speed audit
- **GetGabs WhatsApp Business API** — OTP verification + report delivery
- **MySQL** (`mysql2`) — leads, chat sessions, admin auth, usage/cost tracking

---

## Features

### Two ways in
- **Direct chat** at `/` — visitor picks a practice type tile (Dental / Aesthetic / Hospital / IVF / Other) and chats through the audit.
- **Secure form handoff** — the GrowClinic site posts the lead to `POST /api/intake` (HMAC-style signed header), which returns a one-time token; the visitor is redirected to `/?t=<token>`, so **no PII ever appears in the URL**. The tool pre-fills the details, runs the Google + PageSpeed lookups in parallel, and skips the basic questions.

### Public chat (`/`)
- WhatsApp-style glass UI; 4-step progress (sidebar on desktop, icon strip on mobile)
- Always confirms **role + doctor status** (decides the "Dr." prefix), then collects details
- Live Google Business Profile confirmation card (pincode fallback if not found)
- Website captured **in-chat with URL validation** (no popup)
- **Deferred verification**: a "Send my code / Verify later" choice; the audit never blocks on OTP
- 6-digit WhatsApp OTP; country-code selector

### Gated report (the conversion mechanic)
- The audit always finishes and a report is generated.
- Unverified visitors see a **10% teaser** (overall score + biggest gap) with the rest locked.
- The **full report unlocks only after WhatsApp OTP verification**; editable number + "can't get the code? message us" (carries the report ID).
- On verification the report is **delivered to the lead's WhatsApp** (and email). No verification = nothing sent.
- Report generation parallelises Google + PageSpeed and caps PageSpeed at 25s for speed.

### Admin dashboard (`/admin`)
- **Role-based access**: admin (full + user management), manager (dashboard/leads/usage/logs), caller (leads + click-to-WhatsApp/call)
- Username + password (scrypt) login, optional TOTP 2FA for admins, brute-force lockout
- Dashboard with **Today / Yesterday / This week / This month / All-time** filters
- Leads & chats with search/date filters + CSV export
- **Website Leads tab** — contact/booking submissions forwarded from the GrowClinic marketing site (`popup_leads`), with one-click "Promote" into the CRM pipeline
- **Tracking tab** — GA4, Meta Pixel, Meta CAPI, Google Ads, Microsoft Clarity, Search Console, and the Google-Sheet/CRM webhook, all editable live (no redeploy)
- **Unified Profile page** — one place for identity (display name, designation, department dropdown, LinkedIn, join date, phone, location, avatar) plus email, password, and 2FA
- API key management, usage/cost tracking, activity logs, maintenance mode

### Notifications & system email
- **Every system email sends from one no-reply identity** (`no-reply@growclinic.io`) — never from an individual user's mailbox. `SMTP_USER` is the SMTP login only; the visible sender is `SMTP_FROM` (defaults to no-reply). Configured once in admin settings; no per-user SMTP.
- **Notifications tab (admin)** — a users × notification-types matrix controlling who receives which alert: new-lead, lead-assigned, daily digest, stale-lead digest, sign-in alerts, and server-error alerts. Members without an email are flagged and skipped.
- **Fallback safety** — if no user is subscribed to a type, it still goes to the global `NOTIFY_EMAIL` inbox so nothing is silently dropped.
- **Team broadcast** — admins send one message to all active members with an email, via the same system SMTP.
- The registry is extensible: add a new entry to `NOTIF_TYPES` in `db.js` and it appears in the matrix automatically (no schema change — prefs live in the `notification_prefs` table, which auto-creates on boot).

### Lead delivery
- Every completed lead is saved to MySQL and pushed to a configured **CRM / Google Sheet webhook** (`WEBHOOK_URL`).
- Server-side **Meta Conversions API** (deduped with the browser Pixel) fires on lead capture.

---

## Local development

### Prerequisites
- Node.js 20 or newer
- macOS or Linux (Windows should work but untested)
- API keys: OpenAI, Gemini, Google Cloud (Places + PageSpeed)

### Setup

```bash
# Clone and install
git clone <your-repo-url>
cd growclinic-audit-tool
npm install

# Copy and fill in env vars
cp .env.example .env
# edit .env and add your three API keys

# Run
npm start
```

Open http://localhost:3000 for the chat, http://localhost:3000/admin for the dashboard.

On first run the server prints a generated admin password to the terminal — **save it once, it's not shown again**.

---

## Project structure

```
.
├── server.js              ← Express server + all API routes
├── db.js                  ← MySQL schema + queries, admin users/RBAC, TOTP, usage tracking, secret sync
├── index.html             ← Public chat page
├── admin.html             ← Admin dashboard (single-page)
├── css/styles.css         ← All chat + UI styles
├── js/main.js             ← Chat client logic
├── package.json           ← Dependencies + scripts
├── settings.json          ← Local API key overrides (gitignored)
├── .env.example           ← Template — copy to .env
├── railway.json           ← Railway deploy config
├── nixpacks.toml          ← Pins Node 20 + python3/gcc for native deps
├── Procfile               ← `web: node server.js`
├── DEPLOY.md              ← Railway/Hostinger deploy guide
├── _archive/              ← Old/unused files (gitignored, not deployed)
└── reports/               ← Generated PDF reports (gitignored)
```

---

## Environment variables

See [`.env.example`](.env.example) for the full list. Required:

| Variable | Used for |
|---|---|
| `OPENAI_API_KEY` | Final report generation |
| `GEMINI_API_KEY` | Chat conversation + lead extraction |
| `GOOGLE_API_KEY` | Places API (GMB) + PageSpeed Insights |

Optional but recommended for production:

| Variable | Purpose |
|---|---|
| `DATA_DIR` | Mount path for the persistent volume (DB + reports). Default: project folder. |
| `NODE_ENV=production` | Enables `Secure` flag on session cookies. |
| `WEBHOOK_URL` | Slack/Make.com URL called when a lead is captured. |

---

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions.

The app runs on **Hostinger Node.js hosting** (`audit.growclinic.io`) against a **MySQL** database (`u109269685_audit`). Environment variables are set in **hPanel → Node.js app → Environment Variables** (they override any committed `.env` at runtime and survive redeploys).

**Critical DB-host gotcha (learned the hard way):** use `MYSQL_HOST=127.0.0.1`, **not** `localhost`. On this MariaDB host the Node MySQL driver fails to authenticate through `localhost` even with correct credentials — `127.0.0.1` works. The same applies to the GrowClinic website's `DATABASE_URL`.

Reports live under `DATA_DIR` (persistent path outside the versioned build dir); uploaded assets under `UPLOAD_DIR` — both must point outside `hbuilds/versions/...` or they're wiped on every redeploy.

---

## Common scripts

```bash
npm start              # Production start
npm run dev            # Same as start (no separate dev script)
node --check server.js # Quick syntax check
```

---

## Resetting the admin password

The app uses **MySQL** (not SQLite). If you lose the admin password, reset the default admin in the `admin_users` table via phpMyAdmin, or clear the stored hash so the server regenerates one on next boot:

```sql
-- phpMyAdmin → u109269685_audit → SQL
DELETE FROM settings WHERE keyName = 'ADMIN_PASSWORD_HASH';
```

Then restart the app — the server prints a new generated admin password to the logs (shown once). The bootstrap admin credentials also come from the `DEFAULT_ADMIN` / `DEFAULT_PASS` environment variables in hPanel.

**MySQL user password:** if you rotate the DB password in hPanel → MySQL Databases, you must update `MYSQL_PASSWORD` (audit) / `DATABASE_URL` (website) in the app's hPanel env vars to match, then restart — otherwise the app can't connect.

---

## Security notes (read before going public)

This app is intended to run behind your domain, not on a fully public Wild West URL. Before flipping it live:

1. **Rotate any API key that's been pasted in chat or commits**
2. **Restrict the Google + Gemini keys** to your production HTTP referrer in Cloud Console
3. **Set `NODE_ENV=production`** so session cookies get the Secure flag
4. **Restrict CORS** in `server.js` line 13 from `origin: true` to your specific domain
5. **Enable 2FA** on the admin account immediately after first login
6. **Mount a persistent volume** at `/data` and set `DATA_DIR=/data`
7. **Set quota caps** on your Google API key (Cloud Console → Credentials → key → Quotas)



---

## License

Proprietary © GrowClinic. All rights reserved.
#   G r o w C l i n i c _ a u d i t  
 