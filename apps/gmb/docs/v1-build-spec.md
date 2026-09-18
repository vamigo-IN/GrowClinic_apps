# Gmb V1 Build Spec (in-house)

Concrete engineering artifact for building Gmb on the **audit-tool model**: Node/Express + MySQL on Hostinger, `gmb.growclinic.io`. Reuses existing GrowClinic infra (WhatsApp OTP, Razorpay, no-reply SMTP, Cloutrr legal entity).

**Companion file:** [`db/schema.sql`](../db/schema.sql) — runnable multi-tenant schema.

**V1 tools:** Overview · Health Score · Review Reply · Post Generator · QR. *(Keyword tool + geo-grid deferred.)*
**GBP score model:** shallow audit-teaser (audit.growclinic.io) → deep Gmb score (this product).

---

## 1. Architecture

```
gmb.growclinic.io  ─ Hostinger Node.js app
  ├── /            → existing React/Vite SPA (built to /dist), served static
  └── /api/*       → Express REST API (new)
                      └── MySQL `gmb` DB (Hostinger, MYSQL_HOST=127.0.0.1)
                      └── shared clients: WhatsApp OTP · Razorpay · SMTP
```

- One repo, two processes conceptually: the SPA (already exists) and the API. Simplest: one Express server that serves the built SPA and mounts `/api`.
- **MYSQL_HOST=127.0.0.1** (never `localhost`) — same MariaDB auth gotcha as the other apps.
- Persistent paths (uploads/exports) outside the versioned build dir via an env path — same lesson as `UPLOAD_DIR` on the website.

## 2. Environment variables (hPanel → Node app)

```
DATABASE (own db, separate from audit)
  MYSQL_HOST=127.0.0.1
  MYSQL_PORT=3306
  MYSQL_USER=u109269685_gmb
  MYSQL_PASSWORD=********
  MYSQL_DATABASE=u109269685_gmb

AUTH / CRYPTO
  SESSION_SECRET=****            # sign session tokens
  TOKEN_ENC_KEY=****             # AES-256 key for Google token encryption at rest

WHATSAPP OTP  (reuse the audit tool's provider/credentials)
  WHATSAPP_API_URL=...
  WHATSAPP_API_TOKEN=...

GOOGLE BUSINESS PROFILE
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  GOOGLE_REDIRECT_URI=https://gmb.growclinic.io/api/google/callback

RAZORPAY  (reuse account)
  RAZORPAY_KEY_ID=...
  RAZORPAY_KEY_SECRET=...
  RAZORPAY_WEBHOOK_SECRET=...

EMAIL (reuse no-reply@growclinic.io SMTP)
  SMTP_HOST=... SMTP_PORT=465 SMTP_USER=... SMTP_PASS=... SMTP_FROM="GrowClinic <no-reply@growclinic.io>"

FUNNEL
  INBOUND_HANDOFF_KEY=****       # HMAC secret shared with the audit tool
```

## 3. RBAC matrix (enforce server-side on every request)

| Action | Super Admin | Clinic Admin | Location Mgr | Content Reviewer | Analyst |
|---|---|---|---|---|---|
| Manage org / billing | platform only | ✅ | ❌ | ❌ | ❌ |
| Connect/disconnect Google | ❌ | ✅ | ❌ | ❌ | ❌ |
| Approve **protected** field edit | ❌ | ✅ | if granted | ❌ | ❌ |
| Approve normal edit / content | ❌ | ✅ | ✅ | ✅ | ❌ |
| Reply to review | ❌ | ✅ | ✅ | ✅ | ❌ |
| View dashboards/reports | read (platform) | ✅ | ✅ | ✅ | ✅ |
| Publish any GBP change | **never** | ✅ (consent) | if granted | ❌ | ❌ |

Super Admin can operate the platform (orgs, billing, compliance, support) but **can never publish or modify a clinic's GBP** — enforce as a hard rule.

## 4. REST API contract (V1)

All under `/api`. JSON. Session via httpOnly cookie or `Authorization: Bearer <session>`. Every mutating route writes an `audit_events` row.

### Auth (WhatsApp OTP)
```
POST /api/auth/otp/request     { phone }                         → { ok }             # rate-limited
POST /api/auth/otp/verify      { phone, code }                   → { session, user }  # creates user if new
POST /api/auth/logout                                            → { ok }
GET  /api/auth/me                                                → { user, memberships, activeOrg }
POST /api/auth/switch-org      { orgId }                         → { activeOrg }
```

### Organizations & members
```
POST /api/orgs                 { name }                          → { org }            # onboarding
GET  /api/orgs/:id                                               → { org, locations }
POST /api/orgs/:id/members     { phone, role }                   → { membership }     # invite (clinic_admin)
PATCH/DELETE /api/orgs/:id/members/:mid
```

### Locations
```
GET  /api/locations                                             → [locations]        # scoped to activeOrg
POST /api/locations            { name, city, ... }              → { location }       # draft before Google connect
GET  /api/locations/:id                                         → { location }
```

### Google Business Profile
```
GET  /api/google/connect       → 302 to Google OAuth
GET  /api/google/callback      ?code&state → links account, returns discoverable locations
POST /api/google/select        { googleLocationId, locationId } → { location }        # bind + first sync
POST /api/locations/:id/sync                                    → { syncedAt }        # pull profile/reviews/posts/perf
DELETE /api/google/:orgId/disconnect                            → { ok }              # DELETE tokens immediately
```

### Health Score & actions (consent-led)
```
GET  /api/locations/:id/score                                   → { overall, breakdown[] }
GET  /api/locations/:id/issues ?status                          → [issues]
POST /api/issues/:id/approve   { confirm:true }                 → { issue }           # protected → requires sensitive OTP re-verify
POST /api/issues/:id/publish                                    → { issue, googleResult }
POST /api/issues/:id/dismiss                                    → { issue }
```

### Reviews (Review Reply)
```
GET  /api/locations/:id/reviews ?sensitive                      → [reviews]
POST /api/reviews/:id/draft    { text? }                        → { replyDraft }      # AI or manual; never for sensitive without warning
POST /api/reviews/:id/publish  { text }                         → { review }          # manual approval only
```

### Content (Post Generator)
```
GET  /api/locations/:id/drafts ?type&status                     → [drafts]
POST /api/locations/:id/drafts { type, payload }               → { draft }           # runs policyCheck
POST /api/drafts/:id/approve                                    → { draft }
POST /api/drafts/:id/schedule  { scheduledFor }                → { draft }
POST /api/drafts/:id/publish                                    → { draft, googleResult }
```

### QR Generator
```
POST /api/locations/:id/qr     { type, label }                 → { qr, pngUrl }       # targetUrl = googleReviewUrl
GET  /api/locations/:id/qr                                      → [qr]
```

### Billing (Razorpay)
```
GET  /api/plans                                                 → [plans]              # from code config
POST /api/billing/subscribe    { planId }                      → { razorpaySubscriptionId, checkout }
POST /api/billing/webhook      (razorpay signed)               → 200                  # verify signature
GET  /api/billing/invoices                                     → [invoices]
POST /api/billing/cancel                                        → { subscription }
```

### Super Admin (platform)
```
GET  /api/admin/orgs           GET /api/admin/orgs/:id
GET  /api/admin/billing        GET /api/admin/audit-events
```

## 5. Audit → Gmb funnel (the ecosystem glue)

Reuse the **signed-handoff pattern the audit tool already uses** for `POST /api/intake` (HMAC header, one-time token, no PII in URL):

1. The 150-sec audit scores GBP (shallow). When it flags GBP gaps, it shows a CTA: **"Fix this on Gmb →"**.
2. Audit tool POSTs a signed payload to `POST /api/handoff` on Gmb (`X-Handoff-Key: HMAC(INBOUND_HANDOFF_KEY)`), body `{ clinicName, phone, city, specialty, gbpFindings }`, and receives a one-time token.
3. User lands on `gmb.growclinic.io/?t=<token>`; Gmb pre-fills onboarding (name/phone/city) and pre-seeds the first location + known findings — so the "15-minute activation" starts warm.
4. Later (Milestone 6): Gmb pushes anonymised performance deltas (calls/directions/score movement) back to the website's `CaseStudy` metrics, feeding the case-study engine automatically.

```
POST /api/handoff   (HMAC)   { clinicName, phone, city, specialty, gbpFindings } → { token }
GET  /?t=<token>             → prefilled onboarding
```

## 6. Retention & compliance jobs (cron/interval)

- **90-day purge:** delete `reviews` and `content_drafts` where `retentionExpiresAt < now`.
- **Token hygiene:** on disconnect, hard-delete `google_connections` row; on expiry, mark `expired` and refresh or prompt reconnect.
- **Audit log:** append-only; never expose UPDATE/DELETE.
- India legal pages (Terms, Privacy, Refund, Google API disclosure, consent/retention, grievance) under the **Cloutrr** entity — reuse the website's legal patterns.

## 7. Milestone 1 — concrete first build (the skeleton)

Order of execution for the in-house dev:

1. Create Hostinger MySQL DB `u109269685_gmb`; run [`db/schema.sql`](../db/schema.sql) in phpMyAdmin.
2. Scaffold Express API in the repo (`/server`), one app that also serves the built SPA (`/dist`).
3. Implement session middleware + `audit_events` writer + tenant-scoping middleware (`activeOrg` on every query).
4. WhatsApp OTP: `otp/request` + `otp/verify` (reuse audit-tool WhatsApp client); create user + org on first login.
5. Locations CRUD (draft, pre-Google).
6. Wire the React app: add a real auth guard + router; replace `SAMPLE_PROFILES` reads with `/api/locations`; keep tool UIs, feed them live (still-empty) data.
7. Deploy as a Hostinger Node app at `gmb.growclinic.io` (env vars above; `127.0.0.1` DB host; restart).

**Exit:** a real clinic can WhatsApp-login, land in the dashboard, and see persisted data — no more mock state, no Google yet.

Then Milestone 2 (Google read-only) once your API access is approved, Milestone 3 (score + consented edits), Milestone 4 (reviews + content), Milestone 5 (Razorpay + legal + cohort launch), Milestone 6 (reports + funnel glue).

---

*Build order rule (from the repo's own pipeline): finish this skeleton and the Google read integration before over-building the score/reporting, so design isn't redone once real Google constraints land.*
