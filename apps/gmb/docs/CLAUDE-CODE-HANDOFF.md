# GrowClinic GMB — Handoff Brief (for Claude Code)

You are continuing work on **Gmb** (`gmb.growclinic.io`), GrowClinic's Google Business Profile operations SaaS for clinics & hospitals. Most of the app exists; your advantage over the previous session is that **you can run `npm run dev` / `npm run build` and preview** — use that to iterate visually. The previous environment could not build the app, so all frontend work was written blind.

---

## 1. What this product is

A paid SaaS that helps a clinic keep its Google Business Profile accurate, active, policy-compliant and locally discoverable. Public front door = an **instant GBP audit** (Vizup-style: search your clinic → free score → claim). Authenticated product = a **premium dashboard** (audit, reviews, posts, rankings, competitors, performance, AI assistant, settings).

It's one of four GrowClinic surfaces (website + audit CRM + Sync + **this**). This repo is only Gmb.

## 2. Stack

- **Frontend:** React 18 + **TypeScript** + **Vite 6** + **Tailwind v4** (`@tailwindcss/vite`) + **shadcn/ui** + **Recharts**. Design is neumorphic, GrowClinic green (`#16a34a`), Manrope font. (Originated from a Figma "Premium Healthcare SaaS UI Template", recolored + rebranded.)
- **Backend:** Node **Express** + **mysql2**, in `server/` and `server.js`. Serves the built `dist/` AND the `/api` routes from one process.
- **DB:** MySQL/MariaDB on Hostinger (database `u109269685_gmb`). Multi-tenant.
- **Deploy:** Hostinger Node.js app. Startup file `server.js`, build `npm install && npm run build`. Live on the temp domain `white-oryx-254640.hostingersite.com`; target `gmb.growclinic.io`.

## 3. Repo map

```
server.js                      # Express entry: serves dist/ + mounts /api; boots DB
server/
  config/db.js                 # mysql2 pool (MYSQL_HOST must be 127.0.0.1) + q/one/exec helpers
  lib/util.js                  # uuid, hash, audit-log writer, wrap()
  lib/whatsapp.js              # OTP sender (Meta WhatsApp; graceful if unconfigured)
  lib/places.js                # Google Places API v1 client (autocomplete + details)
  lib/gbpAudit.js              # 12-point explainable audit score
  lib/cache.js                 # tiny TTL cache
  middleware/auth.js           # session load, requireAuth/requireOrg/requireRole
  middleware/rateLimit.js      # per-IP limiter for public audit endpoints
  routes/auth.js               # WhatsApp OTP: request/verify, me, logout, switch-org
  routes/orgs.js               # org create + members (RBAC)
  routes/locations.js          # location (clinic) draft CRUD, scoped to active org
  routes/audit.js              # public instant audit: search / place / lead
db/schema.sql                  # FULL multi-tenant schema (RUN THIS on the gmb DB)
src/
  main.tsx                     # renders <Root/>
  app/Root.tsx                 # AUTH GATE: landing → login → dashboard; lazy-loads dashboard
  app/App.tsx                  # the template DASHBOARD (default export DashboardApp) — 15 screens, mock data
  app/theme.ts                 # shared tokens (green + neumorphic shadows)
  app/lib/api.ts               # fetch client (auth, audit, orgs, locations)
  app/components/AuditWidget.tsx  # instant-audit search → score → claim
  app/screens/Landing.tsx      # marketing landing (2-col hero + sections)
  app/screens/Login.tsx        # split-screen WhatsApp-OTP login
  styles/                      # tailwind v4 + theme.css (green tokens)
docs/                          # product-pipeline.md, v1-requirements.md, design-system.md,
                               # v1-build-spec.md, ecosystem-fit-plan.md, this file
_prototype_backup/             # the old plain-JSX prototype (safe to delete)
```

## 4. How it works today

- **Auth:** WhatsApp OTP. Since WhatsApp isn't wired, set `OTP_TEST_MODE=on` and the OTP is returned in the API response and auto-filled in the UI. Sessions via httpOnly cookie. Multi-tenant: `users → memberships → organizations → locations`.
- **Instant audit:** `AuditWidget` → `/api/audit/search` (Places autocomplete) → `/api/audit/place/:id` (Place Details → 12-point score) → every search saved to `public_audits` as a lead. On "Claim & fix" → Login prefilled with the confirmed place → creates org + location.
- **Dashboard:** the template's 15 screens render with **mock data** ("Dr. Sarah Chen / Austin Family Dental"). Not yet wired to the API. Sidebar is a responsive drawer on mobile; logout wired.

## 5. Environment variables (Hostinger Node app)

```
NODE_ENV=production
MYSQL_HOST=127.0.0.1          # CRITICAL: never `localhost` (MariaDB auth fails)
MYSQL_PORT=3306
MYSQL_USER=u109269685_gmb
MYSQL_PASSWORD=****
MYSQL_DATABASE=u109269685_gmb
SESSION_SECRET=****           # openssl rand -hex 32
TOKEN_ENC_KEY=****            # openssl rand -hex 32 (used by M2 Google token encryption)
GOOGLE_PLACES_API_KEY=****    # Places API (New) enabled; key must NOT be HTTP-referrer restricted (server-side)
OTP_TEST_MODE=on              # returns OTP in response while WhatsApp is not wired — REMOVE before public launch
# WHATSAPP_API_URL / WHATSAPP_API_TOKEN  (optional; when set, real OTP over WhatsApp)
```

## 6. Gotchas learned the hard way (don't rediscover these)

1. **`MYSQL_HOST=127.0.0.1`, never `localhost`.** MariaDB on this host rejects the driver's `localhost` auth. This took down all three GrowClinic apps once.
2. **Build tooling must be in `dependencies`, not `devDependencies`.** Hostinger installs with `NODE_ENV=production`, which skips devDependencies → `vite: command not found`. `vite`, `tailwindcss`, `@tailwindcss/vite`, `@vitejs/plugin-react` are already moved to `dependencies`.
3. **Don't put `# comments` on the same line as a terminal command** — npm/vite treat the `#...` as Vite's root arg → `Could not resolve entry module "#/index.html"`. (There is no stray `#` file.)
4. **Google Places = public data** (enabled, working). **Google Business Profile API** (OAuth, for reviews/posts/edits/performance) is a **separate** API — its access is **APPROVED** for this project, so M2 is unblocked.
5. Recharts v2 deprecation warning and one npm audit item are non-blocking — **do not** run `npm audit fix --force` (breaks the template).

## 7. Run locally

```bash
npm install
npm run dev      # http://localhost:5173  (UI only; /api needs the backend)
npm run build    # produces dist/
```
For full-stack local dev, run the backend too (`node server.js` on :3000 — needs the MYSQL_* env and DB reachable) — `vite.config.ts` proxies `/api` → `:3000`. The DB is on Hostinger, so the practical end-to-end test is on the deployed server.

## 8. IMMEDIATE — known issue to fix first

**Login → "Internal error" on Send OTP.** Almost certainly the auth tables don't exist yet. **Run the ENTIRE `db/schema.sql`** in phpMyAdmin on `u109269685_gmb` (creates `users`, `otp_codes`, `sessions`, `organizations`, `memberships`, `locations`, `public_audits`, `audit_events`, …). `CREATE TABLE IF NOT EXISTS` is safe to re-run. Then confirm `OTP_TEST_MODE=on` + `MYSQL_*` env. Check the Node app **Logs** for the exact error if it persists.

## 9. Roadmap — what's next (in order)

**A. Finish/verify the redesign (in progress).** The landing is a 2-col hero with the audit panel on the right + feature/how-it-works/CTA sections; login is split-screen (value-props/preview left, form right, approachable CTA, WhatsApp only at the phone field). **Run it, eyeball it, refine spacing/copy.** Reference targets: `tryvizup.com/local`, `tryvizup.com/local/gbp-audit`, and the gmbwale login split-screen.

**B. Dedicated `/audit` results page** (like `tryvizup.com/local/gbp-audit`) — a richer standalone report view (score gauge, competitor benchmark, prioritized fixes, share) beyond the inline widget.

**C. Wire the dashboard to real data (P2).** Replace the mock identity ("Dr. Sarah Chen / Austin Family Dental") with the **real logged-in clinic** from `/api/locations` + `/api/auth/me`. Add clean **"Connect your Google Business Profile"** empty states to Reviews/Rankings/Performance (they need Google data).

**D. M2 — Google OAuth + read-only sync** (access is approved). OAuth connect/callback/disconnect, encrypted tokens (`TOKEN_ENC_KEY`), location discovery, sync profile/reviews/posts/Q&A/performance. This makes the dashboard truly live.

**E. M3 — Health score + consented edits.** Real rubric + evidence; protected-field consent (name/address/category/hours/appointment URL/practitioner) with explicit confirmation; publish + Google result record.

**F. M4 — Reviews + Post Generator + QR** (real): review inbox + sensitive-review classifier + manual approval; content drafts → policy check → approve → publish; QR review-request generator.

**G. M5 — Razorpay + legal + launch.** Subscriptions + webhook + GST invoices + plan entitlements; India legal pages under Cloutrr Grow (OPC) Pvt Ltd; 90-day retention jobs; small paid cohort.

**Perf/polish (anytime):** dashboard is already lazy-loaded (170 kB app chunk + 533 kB dashboard chunk). Trim further with `manualChunks` for Recharts if needed. Remove `_prototype_backup/` once happy.

## 10. Guardrails (from the product spec — keep these)

- Never guarantee Google rankings/appointments. Improve factors the clinic controls.
- Protected-field edits and review replies are **never** auto-published — explicit owner consent every time.
- Sensitive reviews (1-star / medical / billing / safety) are flagged and routed for manual handling, never auto-replied.
- Review requests must be rating-neutral (ask for honest feedback, never gate on positive).
- Super Admin can operate the platform but can **never** publish/modify a clinic's GBP.

---

*Companion docs in `docs/`: `v1-requirements.md`, `product-pipeline.md`, `design-system.md`, `v1-build-spec.md`, `ecosystem-fit-plan.md`. Schema in `db/schema.sql`.*
