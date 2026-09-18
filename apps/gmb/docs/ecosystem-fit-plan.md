# Gmb → GrowClinic Ecosystem: Gap Analysis & Launch Plan

**Goal:** turn the Gmb prototype into a real, launchable, easy-to-manage product at `gmb.growclinic.io` that fits cleanly into the existing GrowClinic ecosystem — reusing the infrastructure you already operate instead of rebuilding it.

**Prepared from:** the actual repo (`iapsr/gmb`) — README, `docs/v1-requirements.md`, `docs/product-pipeline.md`, and the source (`src/App.jsx`, views, modals, `data/*`).

---

## 1. Where things stand today (grounded in the code)

Gmb is a **React 19 + Vite single-page prototype**. It is a well-designed, honestly-labelled *demo* — not a product yet.

What exists:
- A public landing page, a clinic dashboard, and a Super Admin view, switched by in-memory state (`currentView` in `App.jsx` — no router, no auth guard).
- Seven dashboard tools as UI: Overview, Audit, Keyword Tool, Photo Planner, Post Generator, QR Generator, Review Reply.
- Onboarding, checkout, legal, and consent **modals** — all simulated.
- Mock data only: `sampleProfiles.js`, `profileFactory.js`, `keywordDatabase.js`, `marketingData.js`. A "clinic profile" object shape is already defined (NAP, categories, metrics, audit issues, reviews) — useful as the seed for the real schema.

What does **not** exist (per the README's own admission and confirmed in code):
- No authentication, no database, no multi-tenancy, no server of any kind.
- No WhatsApp OTP, no Google OAuth, no Google Business Profile API calls.
- No Razorpay/payments, no GST invoicing.
- Every action (audit, publish, checkout, export, QR download) is a labelled preview.

**In their own pipeline terms, the code is at Phase 0–1 of 7.** The docs already describe the full journey; the build is the gap.

---

## 2. Gap analysis

Organised by area, with severity for an India MVP launch. **P0 = blocks launch, P1 = needed for a real paid product, P2 = fast-follow.**

### A. Platform foundation (backend) — **P0**
- No backend service, database, or hosting. Everything is client-side memory.
- No user accounts, sessions, or authorization. Anyone can reach the "app" view.
- No multi-tenant data model (organizations → locations → memberships) or per-request authorization.
- No audit log (the requirements demand immutable records for auth, consent, edits, publishing, exports).
- No secret/token storage, no background jobs, no retention/deletion jobs.

### B. Identity & access — **P0**
- WhatsApp OTP login is a modal stub. Needs real OTP issue/verify, expiry, rate limiting, retry caps, re-verification for sensitive actions.
- RBAC roles are documented (Super Admin, Clinic Admin, Location Manager, Content Reviewer, Analyst) but not enforced anywhere.

### C. Google Business Profile integration — **P0 + long lead time**
- No Google OAuth, no account/location discovery, no data sync, no publishing.
- **Requires Google Cloud project + Business Profile API access approval** — this is an external vetting process that can take weeks. **This is the single longest-pole item; start it first.**
- Needs token encryption, rotation, disconnect-and-delete, sync-failure recovery, and a Google "result record" per published edit.

### D. Health Score & action engine — **P1**
- Score is currently mock numbers. Needs the real, explainable rubric (Identity/NAP, Core profile, Patient access, Trust/reputation, Content freshness, Local visibility) with evidence per deduction.
- Consent flow for protected fields (name, address, primary category, hours, appointment URL, practitioner data) must be enforced server-side — no bulk/AI/Super-Admin bypass.

### E. Reputation & content ops — **P1**
- Review inbox, sensitive-review classifier, escalation notifications, manual approval, privacy-safe AI drafts — all UI-only today.
- Post/media/Q&A drafting → policy check → approval → schedule → publish pipeline not built.
- Review-request templates must stay rating-neutral (already fixed in copy; enforce in product).

### F. Local visibility & reporting — **P1/P2**
- Keyword tool is mock. Real version derives keywords from approved GBP data + user confirmation.
- Geo-grid rank tracker needs a data provider, quotas, scheduled scans, history, confidence labels.
- Performance reports (calls, directions, clicks, views, reviews, response time, score movement) must separate Google facts vs modeled insight vs rank-tracker measurement.

### G. Billing & compliance — **P0 for paid launch**
- Razorpay subscriptions, webhook verification, failed-payment recovery, cancellation/refund, GST invoices, plan entitlements/usage limits — none built.
- India-first legal pages (Terms, Privacy, Refund, Google API disclosure, consent/retention, grievance contact) exist as a modal shell; need real, reviewed content tied to the Cloutrr entity.

### H. Ecosystem integration — **P1 (this is the "fit" work)**
- No connection to the audit tool, Sync, or the marketing site today. See §3.
- Branding is *close* but diverged: Gmb docs specify Archivo + IBM Plex Sans; the main site uses its own type/colours. No shared design system.

### I. Ops / DevOps — **P1**
- No CI, tests, environments, structured logging, monitoring, alerts, or backups.
- Only `oxlint` + `vite build`. Deployment target for `gmb.growclinic.io` undefined.

---

## 3. How it fits the ecosystem (the "arrange it" part)

Gmb is your **fourth pillar and first true SaaS product**. The others are done-for-you agency services; Gmb is self-serve software clinics pay for directly — on GBP, a service you already sell and already have case studies for.

**The funnel that ties it together:**

> The 150-second **audit** (audit.growclinic.io) already scores a clinic's Google Business Profile → flag GBP gaps → route the clinic to **gmb.growclinic.io** to fix and *maintain* them continuously → Gmb generates real performance proof (calls, directions, score movement) → that proof becomes **case studies** on growclinic.io → which drive more audits.

**Reuse what you already run (this is what makes it easy to launch & manage):**

| Need in Gmb | Already in the ecosystem | Action |
|---|---|---|
| WhatsApp OTP | Audit tool sends WhatsApp (OTP + messages) via existing provider | Reuse the same WhatsApp setup/credentials |
| Payments + GST | Razorpay is already in the GrowClinic stack | Reuse the Razorpay account; add a subscriptions flow |
| System email | The no-reply@growclinic.io SMTP system | Reuse for Gmb transactional email |
| Legal entity | Cloutrr Grow (OPC) Pvt Ltd (footer/legal on main site) | Reuse for Gmb's India legal pages |
| Backend stack + hosting + DB | Audit tool runs Node/Express + MySQL on Hostinger, with an admin, RBAC-style roles, notifications | **Build Gmb's backend on the same stack/host** so one team, one ops model |
| Design language | GrowClinic brand system | Unify tokens into one shared design system |
| Case-study data | New data-driven case studies with metrics | Pipe Gmb's GBP performance numbers straight into case studies |

**Decide the GBP-score relationship:** the audit tool and Gmb both score GBP. Pick one of two models — (a) the audit's GBP module *is* Gmb's score (single engine, audit calls Gmb), or (b) the audit stays a shallow teaser and Gmb owns the deep score. Recommendation: **(b) for launch** (less coupling), converge to (a) later.

---

## 4. Recommended architecture (fastest safe path)

**Don't greenfield a new stack.** Mirror the audit tool so your team manages one kind of system:

- **Backend:** Node/Express (same as audit tool) exposing a REST API for the Gmb React app.
- **DB:** MySQL on Hostinger (same host), a **separate `gmb` database**, multi-tenant schema (`organizations → locations → memberships → users`, plus `audit_events`, `google_tokens` (encrypted), `reviews`, `drafts`, `subscriptions`).
- **Frontend:** keep the existing React/Vite app; point it at the new API; add a real auth guard + router.
- **Subdomain:** `gmb.growclinic.io` as its own Hostinger Node app (like audit.growclinic.io). **Use `127.0.0.1` for MySQL host** — the same gotcha that took the other apps down.
- **Shared services:** WhatsApp OTP, Razorpay, no-reply SMTP — thin internal clients pointing at the existing accounts.
- **Jobs:** a lightweight scheduler for GBP sync, retention/deletion (90-day), and rank scans.

The data shape in `profileFactory.js` is a good starting point for the `locations` table.

---

## 5. Phased launch plan (pragmatic, MVP-first)

The repo's 7-phase pipeline is sound; here it is compressed and re-sequenced for **fastest safe India launch + easy management**, with the ecosystem hooks built in.

**Milestone 0 — Unblock the long pole (start immediately, parallel to everything):**
- Apply for Google Cloud project + **Business Profile API access**. This gates the whole product and is out of your control on timing.
- Confirm reuse of WhatsApp, Razorpay, SMTP, Cloutrr legal entity.

**Milestone 1 — Real skeleton (2–3 wks):** Node/Express + MySQL on Hostinger; multi-tenant schema; WhatsApp OTP auth (reuse existing WhatsApp); RBAC; audit log; sessions; deploy `gmb.growclinic.io`. Wire the React app to the API; add auth guard + router. *Exit: a real account can log in and see persisted (still-mock) data.*

**Milestone 2 — Google read-only (after API approval):** OAuth connect, location discovery, sync of profile/reviews/posts/media/Q&A/performance, encrypted tokens, disconnect-and-delete. *Exit: a connected clinic sees its real verified data.*

**Milestone 3 — Health Score + consented edits:** real rubric with evidence; prioritized action queue; protected-field consent enforced server-side; before/after + Google result records. *Exit: every deduction links to evidence + an owner-approved action.*

**Milestone 4 — Reputation + content ops:** review inbox, sensitive-review escalation + notifications, privacy-safe drafts (manual approval); post/media/Q&A approval→publish pipeline; rating-neutral review requests (tie the QR/review nudges into Sync's WhatsApp rails).

**Milestone 5 — Billing + legal + launch:** Razorpay subscriptions + webhooks + GST invoices + plan entitlements; finalize India legal pages under Cloutrr; small paid cohort; security/privacy/Google-policy review. *Exit: real, auditable paid workflow; the 15-minute activation promise verified.*

**Milestone 6 — Reporting + funnel glue (fast-follow):** performance reports (facts vs modeled vs rank-tracker); geo-grid rank tracker; **audit→Gmb handoff** and **Gmb→case-study metric pipe**.

> Follow the repo's own advice: finish the skeleton and Google integration before over-building the score/reporting, so design isn't redone once real Google constraints land.

---

## 6. Decisions I need from you

1. **Backend stack:** build on the audit tool's Node/Express + MySQL/Hostinger model (recommended, one ops model)? Or a different stack?
2. **GBP score:** shallow-audit-teaser + deep-Gmb-score for launch (recommended), or unify the engines now?
3. **Scope for first paid launch:** which of the seven tools ship in v1 vs fast-follow? (Recommend: Overview + Health Score + Review Reply + Post Generator + QR; defer Keyword/Geo-grid.)
4. **Google API access:** who owns the Google Cloud application and verification? (Long pole — start now.)
5. **Team/effort:** is this in-house build, or do you want me to spec it so a developer can execute?

---

## 7. Immediate next steps (this week)

1. Kick off the **Google Business Profile API access** application (longest lead time).
2. Confirm reuse of WhatsApp, Razorpay, SMTP, and the Cloutrr legal entity.
3. Approve the stack decision (§6.1) so I can produce the concrete backend schema + API spec.
4. I draft the **multi-tenant DB schema + REST API contract** and the **audit→Gmb funnel** wiring as the first build artifacts.

---

*This plan intentionally reuses the systems you already operate (WhatsApp, Razorpay, SMTP, Hostinger/Node/MySQL, the Cloutrr entity, the GrowClinic brand) so Gmb is fast to launch and cheap to manage — one team, one ops model, one funnel.*
