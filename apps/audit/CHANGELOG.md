# Changelog

## 1.11.0 — Website Leads, Unified Profile & Notification Management

Brings GrowClinic marketing-site leads into the CRM, consolidates the two profile surfaces into one, and adds admin-controlled per-user notification routing. Also documents the MySQL host gotcha that took down both apps during a password rotation.

### 🌐 Website Leads → CRM
- **New "Website Leads" tab** surfaces contact/booking submissions forwarded from the GrowClinic marketing site (`popup_leads`), which previously had no UI and were invisible.
- **One-click "Promote"** converts a website lead into a `chat_session` with `leadCaptured=1`, so it lands on the CRM kanban board immediately. Marks the source lead `converted` to prevent duplicates.
- The marketing site's contact and booking forms now fire-and-forget POST every submission to `audit.growclinic.io/api/lead-magnet`, so nothing is lost.

### 👤 Unified profile
- The workspace "Edit profile" modal and the account "My Profile" page are **merged into one profile surface**. Identity (display name, designation, **department dropdown + free-type**, **LinkedIn**, **join date**, **phone**, **location**, avatar) now lives alongside email, password, and 2FA.
- New `admin_users` columns (`linkedin`, `phone`, `location`, `joinDate`) auto-create on boot.

### 🔔 Notification management
- **New admin "Notifications" tab** — a users × types matrix controlling who receives each system email: new-lead, lead-assigned, daily digest, stale-lead digest, sign-in alerts, server-error alerts. Members without an email are flagged and skipped.
- Recipients now resolve from the matrix (with the global `NOTIFY_EMAIL` as a safety fallback) instead of a single hard-coded inbox. Every email still sends from the `no-reply@growclinic.io` identity.
- **Extensible registry** (`NOTIF_TYPES` in `db.js`) + a generic `notification_prefs` table — future project-management alerts plug in with no schema change.
- Endpoints: `GET`/`POST /admin/notifications/prefs` (admin-only).

### 🛠️ Ops / deploy
- **DB host fix documented:** use `MYSQL_HOST=127.0.0.1` (and `127.0.0.1` in the website `DATABASE_URL`), never `localhost` — the MariaDB host rejects the driver's `localhost` auth even with valid credentials.
- README updated: Website Leads, unified profile, notifications, MySQL reset steps, and `UPLOAD_DIR`/`DATA_DIR` persistence notes.

## 1.10.0 — International Verification + Google Calendar Sync + CRM & Email Polish

Makes the funnel work for US / UK / AE (and beyond) with IP-based country defaults and email verification, adds a real Google Calendar integration, tightens system email to a single sender, fixes Meta Lead Ads auto-import, and sharpens the CRM board.

### 🌍 International lead verification
- **Country is detected from IP** (`GET /api/geo`, with a CDN country-header shortcut and a graceful fallback to locale/India). US/UK/AE visitors default to the right dial code instead of +91; a manual pick always wins and is never overridden.
- **Email verification for every market except India.** India keeps WhatsApp OTP; the rest of the world verifies by a 6-digit email code sent through the same `no-reply@growclinic.io` SMTP. The verify step swaps the phone field for an email field automatically, and the AI's contact ask is channel-neutral so it never promises the wrong channel.
- **No lead is lost if they skip the code.** The email is captured the moment it's entered, so the final report link is emailed to that address at report time even if the user picks "Verify later" or abandons the code. Delivery is idempotent — exactly one send per lead across all paths.
- India's WhatsApp flow and the locked-teaser gate for unverified India leads are unchanged.

### 📅 Google Calendar (OAuth two-way sync)
- **Connect a Google account once** (Integrations → Google Calendar): OAuth 2.0 with offline access; the refresh token is stored server-side and never exposed to the browser.
- **Meetings sync automatically** — setting a lead's meeting/follow-up time creates a real Calendar event; changing the time updates it; clearing it deletes it. The event id is stored per lead (`gcalEventId`) for updates.
- **Endpoints** `/admin/integrations/gcal/connect|callback|disconnect|status` (admin-only). The callback is guarded by a single-use OAuth `state` rather than the session cookie, because the app cookie is SameSite=Strict and isn't sent on Google's cross-site redirect.
- Existing `.ics` email invites and prefilled "Add to Google Calendar" links remain as a no-auth fallback.

### ✉️ System email hardening
- **All notifications now send FROM a single no-reply identity** (`no-reply@growclinic.io`) — never from an individual user's mailbox. `SMTP_USER` is the SMTP login only.
- **SMTP + Email Alerts + Calendar config are admin-only.** The System Email, Email Alerts and Google Calendar cards are hidden from non-admin roles, and `/admin/tracking` refuses to read or write those keys for support/marketer (so SMTP credentials are never exposed to them).

### 📩 Meta Lead Ads fix
- **Resolves the `(#200) Requires pages_manage_ads permission` error** on auto-import. The poller now derives a **Page access token** from the configured token before reading `leadgen_forms`/`leads` (the reads require a Page token, not a User/System-User token), falling back to the original token when one can't be derived.
- The **Test** button now validates real lead-form read access, not just page reachability, and the setup hint lists the full scope set (`leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` + a Page role).

### 🗂️ CRM board & Leads table
- **CRM cards sort newest-first** within each stage by most recent activity (falling back to capture time for untouched leads).
- **The whole CRM lead tile is clickable** to open the lead — not just the "View" link — while WA/Call links and drag-and-drop keep working.
- **Leads & Chats table now sorts newest-first by default**, and every column header (Started, Clinic/Name, City, Phone, Source, Msgs, Status) is clickable to sort, with a direction toggle and arrow indicator. Previously the table grouped by status, which buried brand-new leads below older verified ones.
- Fixed a latent bug where the client-side read-only guard for auditor/marketer never engaged (`window.currentRole` was always undefined); server-side RBAC was already enforcing regardless.

## 1.9.0 — Expanded Roles + Resilient Webhook Delivery

Broadens the team access model from 3 roles to 7 and makes outbound CRM webhooks self-healing so no lead event is silently lost when n8n, Google Sheets or Telegram is briefly unreachable.

### 👥 User management (7 roles)
- **Four new roles** — `consultant`, `auditor`, `support`, `marketer` — added to the `ROLES` validation set alongside `admin` / `manager` / `caller`.
- **Per-route `requireRole` gating** across overview, dashboard, stats, reports, logs and tracking. `marketer` gets read access to those plus write access to tracking-pixel config only (`/admin/tracking`).
- **`support` guard on `PATCH /admin/users/:id`** — support users cannot modify `admin` accounts and cannot change (elevate) any user's role. Last-active-admin demote/disable protection preserved.
- **Read-only enforcement is defense-in-depth** — `auditor` / `marketer` are blocked from state-changing requests client-side (in the `api()` wrapper, with exceptions for self-service and marketer tracking writes) *and* server-side, since those roles are simply absent from every write route's `requireRole` list.
- **Frontend** — `ROLE_TABS` extended for each new role; invite form (`#nu-role`) and inline user-row dropdowns (`.u-role`) offer the new roles; "+ New Prospect" / "Bulk Import" hidden for read-only roles.

### 🔁 Resilient integration & retry layer
- **`failed_crm_events` queue** — new table (auto-created at boot) storing failed outbound deliveries with `attempts`, `nextRetryAt` (indexed) and `lastError`.
- **Failure capture in `sendCrmEvent`** — webhook, Google Sheets and Telegram deliveries that error or time out are now enqueued instead of being fire-and-forget.
- **Backoff worker (every 2 min)** — redelivers pending events (`attempts < 5`, `nextRetryAt <= now`); success dequeues, failure reschedules with exponential backoff (5 min × 2^attempts) and parks after 5 attempts. Config-removed targets are discarded cleanly.
- **Admin/support queue endpoints** — `GET /admin/integrations/queue`, `POST /admin/integrations/queue/retry/:id` (immediate replay), `DELETE /admin/integrations/queue/:id` (manual dequeue), surfaced as a retry-queue panel in the Integrations tab.

### 🐛 Fixes
- **Inbound `specialty` now captured** — `mapInboundLeadFields` maps specialty/specialization across the generic, Google Ads and Meta payload shapes (previously read by `ingestExternalLead` but never populated, so it silently dropped). `email` mapping confirmed on the same path.
- `SMTP_USER` / `SMTP_FROM` default to `no-reply@growclinic.io` when unset.

## 1.8.0 — International Launch (AE / US / UK / CA) + Bug Fixes

Prepares the tool for launch in the UAE, US, UK and Canada alongside India, and fixes a batch of bugs found in a full-code audit.

### 🌍 Internationalisation
- **Phone handling is country-aware end-to-end.** `messaging.parsePhone()` splits known country codes (+971/+1/+44/+91/…) instead of assuming India; OTP send/verify now REQUIRE an explicit country code (400 otherwise); teaser unlock page parses the lead's phone by country (9-digit UAE numbers prefill correctly), adds a 🇨🇦 option and auto-selects the country from the browser locale.
- **Frontend pickers auto-detect the visitor's country** from the browser locale (AE/US/UK/CA/IN + more); exit-intent popup gets a real country-code selector instead of hardcoded +91.
- **`parsePrefillPhone()` (website form handoff) rewritten** — accepts +971/+1/+44 formats, UK trunk-zero local numbers, etc. (was: rejected everything that wasn't a 10-digit Indian number).
- **Postal codes accepted in any format** (UK postcodes, US ZIPs, Canadian codes, Indian pincodes) in chat, intake fallback and GMB lookup. India Post resolver still used for 6-digit Indian pincodes only. Removed the hardcoded `"…india"` Google search query.
- **AI prompts are multi-country.** Chat + report prompts infer the user's country and use its currency (AED/$/£/C$/₹) for budget options and benchmarks; region-specific copy removed from fallback reports.
- **Meta CAPI conversion currency derived from the lead's phone country** (was hardcoded INR).
- **SEO schema**: `areaServed` now `["AE","US","GB","CA","IN"]`; offer currency INR → USD. Popup trust copy updated.

### 🐛 Bug fixes
- **Maintenance page script crash** — unescaped apostrophe killed the whole inline script (lock animation AND the staff access-code box). Staff can bypass maintenance again.
- **Simulated OTP hardening** — with WhatsApp unconfigured, any 6-digit code "verified" any number. Now refused in production unless `ALLOW_SIMULATED_OTP=true` is set.
- **Memory leaks** — `sessions`, `reportProgress` and `pageSpeedWarmCache` now expire after 6h idle (were unbounded until restart).
- **Google Places calls get 8s timeouts** (could previously hang report generation indefinitely).
- `/api/visit` gets its own rate-limit bucket (page loads no longer consume chat quota).
- Teaser OTP send now includes `sessionId` (funnel tracking was missing the otpSent event from the teaser).
- Awaited `db.deleteSettings()` in admin maintenance/tracking routes; report date locale en-IN → en-GB; "any 4 digits" log message corrected to 6.

## 1.7.0 — Clinical Diagnostic Reposition

The chat repositions from "AI assistant" to **clinical diagnostic tool**. New auditor identity, new copy, new trust signals — non-tech doctors should now feel they're using a stethoscope, not a chatbot.

### 🩺 Brand identity
- **Dr. Aanya** — clinical growth auditor (stylized SVG avatar with subtle pulse ring)
- Browser title: "GrowClinic · Clinical Growth Audit"
- New tone: calm, diagnostic, professional. No "AI", "bot", "GPT" anywhere
- Single-emoji-per-three-messages rule baked into prompt
- Address users as "Dr. [Name]" or "Doctor"
- Never repeat user's name in every message

### 🎨 Hero state
- New headline: *"The clinical diagnostic for your patient pipeline."*
- Subhead introduces Dr. Aanya by name
- 3 suggestion chips for fast onboarding (dental / cosmetic skin / multispecialty)
- Trust strip across the top: "500+ clinics audited · Live data, real benchmarks · Encrypted & private"
- Animated SVG avatar with breathing pulse ring (clinical not gamified)

### 📊 Sidebar — diagnostic stages, not "Step X of 4"
- New tagline: "Audited 500+ clinics across multispecialty, dental, dermatology & aesthetics"
- "Live findings" panel populates mid-conversation (e.g. estimated patient gap)
- Privacy strip anchored at sidebar bottom — encryption + no-resale assurance with lock + shield icons
- All copy in clinical voice — no "boosters" or marketing puff

### ✏️ Copy refresh (no regional references)
- Verification: *"Before I run the live diagnostics, I'll verify your number to keep your audit private."*
- After OTP: *"Verified. Running the live diagnostics now."*
- Role question: *"Welcome. To tailor this audit, may I know your role at the practice?"*
- Acknowledgements: "Noted." / "Understood." / "Worth flagging." (no "Nice 👊" / "Ouch 😬")
- Powered-by line: "GrowClinic · Clinical Growth Audit · v1.7"

### 🧠 AI tone (Dr. Aanya)
- Removed all India-specific colloquialisms and regional name-drops (no "GCC", "Tier 1/2", "Mumbai/Dubai/etc." mentioned in the system prompt)
- Currency stays neutral unless the user explicitly anchors a city
- Frames negative findings as "fixable with a clear plan" — never alarmist
- Surfaces benchmark insight before the next question when relevant

### 🎨 Visual hierarchy & color discipline
- Brand blue (`#3B82F6`/`#1E3A8A`) reserved for: logo, Dr. Aanya avatar gradient, privacy-strip icons, trust badges
- Growth green (`#10B981`/`#34D399`) does ALL the action work: send button, user bubble, progress fills, CTAs
- Tier-3 status colors (amber/red/green) only for warnings/errors
- New typography rules: display 1.85rem (hero only), eyebrow 0.7rem uppercase, body 1.02rem at 96% white opacity

---

## 1.6.5 — Black glass + green-hero rebrand

### 🎨 New visual identity
- **Black + glass** theme replacing the previous light glass — deep `#050507` base with subtle green/blue radial nebulas, slow ambient drift animation
- **Success green** (`#10B981` / `#34D399`) is now the primary brand colour — used on send button, user bubbles, AI avatar, progress bars, option pills, role-card highlights
- **Brand blue** rationed — used only as a low-key accent (`var(--gc-blue)` calls) where green would be wrong
- **No purple anywhere** — every `#6D28D9`, `#8B5CF6`, `#7C3AED` swept out
- **Warning colours preserved** — amber for warnings, red for errors, both unchanged
- **Glass surfaces everywhere** — sidebar, main panel, message bubbles, modals, progress strips all use `rgba(255,255,255,0.04–0.08)` + heavy backdrop-blur
- **Text hierarchy on dark** — opacity-based scale: 96% / 78% / 55% / 38%

### ✨ Animations
- Avatar shine sweep — 4–5s cycle over header + AI bubbles
- Status dot pulse with green glow
- Booster items stagger-fade in (sidebar)
- Progress dot pulse on active step
- Send button rotates 6° on hover, springs back on click
- Animated conic-gradient ring around the chat input on focus (Claude-inspired)
- Body background slow drift over 30s

### 💬 Claude-style chat input
- Pill-shaped dark glass with `rgba(255,255,255,0.04)` bg, 24px backdrop-blur
- Animated rotating gradient ring on focus
- Caret colour matches success green
- Placeholder fades opacity on focus
- Send button: green gradient, soft glow, hover rotates + scales, click bounces

### 🌏 International language
- New title: **"GrowClinic AI · Next-Gen Clinic Growth Diagnostics"**
- Meta description targets India + GCC + US/CA/AU
- AI prompt detects market from city: ₹ for India, AED/SAR/$ for GCC, $ for US/CA, $ for AU
- Avoids India-only colloquialisms ("do the needful")
- Matches user's spelling preferences ("centre" vs "center", etc.)
- Sidebar boosters reworded: "Live audit < 60s · Built for IN · GCC · US · CA · AU · Personalised growth plan"
- Powered-by line: "GrowClinic AI · Built for healthcare growth, globally"

---

## 1.6.4 — Production-ready release

### 🔐 Security hardening
- Static file serving locked down to `public/` only — `settings.json`, `db.js`, `*.sqlite`, `.env`, and source code are no longer reachable via HTTP
- SSRF protection on `/api/website-preview` and `extractNameFromWebsite` — DNS resolution + private-IP block (RFC1918, loopback, link-local, IPv6 ULA, 169.254 cloud-metadata)
- Per-IP rate limiting: chat 30/min, GMB lookup 20/min, website preview 15/min, admin login 10/min
- HTML escape on every user-controlled field in the public report page
- DOM XSS escape on Google Places + website-preview data in the chat UI
- Outbound fetch body size cap (2MB) to prevent memory exhaustion
- Path traversal protection on `:sessionId` route params (alphanumeric only)
- Production error handler hides stack traces / `err.message`
- CORS allow-list via `PUBLIC_ORIGIN` env var (no more `origin: true`)
- Admin password to file with `0600` perms, never to console logs

### 🔑 Admin authentication
- `ADMIN_INITIAL_PASSWORD` env var for managed-host deploys (no shell access required)
- TOTP 2FA via Google Authenticator / Authy / 1Password — RFC 6238 compliant, built with Node `crypto`
- Brute-force lockout: 8 failed attempts in 15 minutes triggers a temporary IP-based block
- HttpOnly + SameSite=Strict cookies; `Secure` flag in production
- Sessions expire after 8h; auto-cleanup of expired sessions

### 📊 Admin dashboard
- 4 tabs: Chats · API Usage · API Keys · Security
- Live counters: total chats, today, completed leads, last 7 days
- Searchable chat list with full transcript modal + permanent-delete
- API token usage per provider (Gemini / OpenAI / Maps / PageSpeed) with day/week/month bucketing + custom date range
- API key management — add, replace, remove without redeploy

### 🤖 AI provider split
- **Gemini** (`gemini-2.5-flash`) — chat conversation + lead extraction
- **OpenAI** (`gpt-4o-mini`) — final report generation
- Auto-fallback to OpenAI if Gemini extraction fails
- 30-second timeout on Gemini calls so requests never hang
- Token usage logged per call to `api_usage` table

### 💬 Chat UX
- iPhone-glass-style WhatsApp UI with proper backdrop blur + inset highlights
- 4-step progress bar (was 6) — Clinic → Verification → Audit → Report
- Mobile bottom progress strip with icon-only step pills
- GMB-first flow: city captured → automatic Maps lookup → confirmation card before any pincode question
- Buffered city message ensures AI never asks redundant questions
- Hospital vs clinic vocabulary — AI matches user's role
- Smart specialty detection from clinic name (Dental, Hair, Skin, IVF, Eye Care, Ortho, etc.)
- Centered modal for report generation with animated checkmark on success
- Bigger fonts (1.02rem) + bigger bubbles + fixed wrapping on short words

### 📱 Mobile improvements
- Bubble sizing recalculated for narrow viewports (`calc(100vw - 80px)` for AI, `calc(100vw - 32px)` for user)
- iOS Safari auto-zoom prevented (input font ≥16px)
- Modals constrained to viewport with breathing room
- Tighter padding on chat-messages, send button, option pills
- 4-step icon strip pinned to bottom of chat-main on mobile

### 🚀 Deployment
- `nixpacks.toml` pinning Node 20 + python3 + gcc for native modules
- `railway.json` with health-check at `/api/health`
- GitHub Actions workflow for SSH-deploy to Hostinger VPS
- Hostinger managed Node.js git-deploy supported via env vars
- `DATA_DIR` env var routes SQLite + reports + admin password file to a persistent volume mount

### 🧹 Repo organisation
- Legacy files moved to `_archive/` (gitignored, not deployed)
- `.gitignore` tightened — `.env`, `settings.json`, `*.sqlite`, `leads.json`, `_archive/` all excluded
- README + DEPLOY guides written for Railway and Hostinger paths
