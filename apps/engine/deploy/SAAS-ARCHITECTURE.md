# Engine — Multi-Tenant SaaS Architecture

Turns the single-clinic engine into a CRM SaaS that any website (Webflow, WordPress,
coded) plugs into with **one activation key**, with **Free + Pro** tiers and
**strict per-clinic data isolation**.

> This is the spec to approve. It requires app-code changes (schema + API + admin).
> No app code has been changed yet — deployment files only.

---

## 1. Core concept

- The unit of tenancy is a **Clinic** (a.k.a. tenant / workspace / hospital).
- Each Clinic has **one activation key** — the single credential that connects any of
  their websites to the engine and identifies which clinic a lead belongs to.
- Every record (lead, patient, appointment, follow-up, user) carries a `clinicId`.
- Every query is **automatically scoped to the caller's `clinicId`** — a clinic can
  never read or write another clinic's data. This is enforced at the data layer, not
  just the UI.
- Two roles of access:
  - **Platform SUPER** (you / GrowClinic) — can see all clinics, create clinics, issue keys, set plans.
  - **Clinic users** — scoped to their own clinic only (existing clinic/super role logic moves under a clinic).

---

## 2. Data model (new / changed tables)

```
Clinic
  id            (pk)
  name
  slug
  plan          enum: FREE | PRO        (default FREE)
  status        enum: ACTIVE | SUSPENDED
  createdAt

ActivationKey
  id            (pk)
  clinicId      (fk -> Clinic)
  key           (unique, e.g. "eld_live_9f3c…")  <-- the ONE key the website uses
  allowedOrigins  text (CSV of domains allowed to post, e.g. "esthetiqueledivine.com, www...")
  revoked       bool
  createdAt

# Every existing table gains a clinicId column + index:
Lead / Query      + clinicId
Patient           + clinicId
Appointment       + clinicId
FollowUp          + clinicId
AdminUser         + clinicId (null = platform super)
```

Migration path for ELD: create one Clinic ("Esthétique Le Divine", plan = PRO),
backfill `clinicId` on all existing rows, issue its activation key.

---

## 3. Activation key — how it works

- Created by platform admin when a clinic is onboarded. Shown once, stored hashed.
- Format: `clinicslug_live_<random>` so it's self-identifying and easy to support.
- Carries an **origin allow-list** so a stolen key can't be used from a random domain.
- Used two ways:
  1. **Browser embed** (`embed.js`) sends it as `data-key`; the API checks the
     request `Origin` against the allow-list (CORS + server check).
  2. **Server-to-server** (native form webhooks) sends it as `X-Engine-Key` header.
- Revocable and rotatable from the admin without redeploying anything.

---

## 4. Free vs Pro (feature gating)

Gating is driven by `Clinic.plan`. Suggested split (tune to your pricing):

| Capability | Free | Pro |
|---|---|---|
| Connected websites | 1 | Unlimited |
| Lead capture + inbox | ✓ | ✓ |
| Leads / month | capped (e.g. 50) | unlimited |
| Patients & appointments CRM | basic | full |
| WhatsApp / email lead alerts | — | ✓ |
| Follow-ups & pipeline stages | — | ✓ |
| Team members | 1 | multiple |
| Data export / API access | — | ✓ |
| Remove "Powered by GrowClinic" | — | ✓ |

Enforcement lives in one place (a `plan-limits` helper) checked by the API and the
admin UI, so upgrading a clinic is just flipping `plan` to `PRO`.

---

## 5. Lead ingest API (the connector)

**Endpoint:** `POST https://engine.growclinic.io/api/ingest/lead`

**Auth:** activation key (header `X-Engine-Key`, or `data-key` via embed) + Origin check.

**Body (JSON):**
```json
{
  "name": "Ananya Sharma",
  "phone": "+9198…",
  "email": "a@example.com",
  "message": "Interested in laser hair reduction",
  "treatment": "laser-hair-removal",
  "source": "webflow-landing",
  "meta": { "utm_source": "meta", "utm_campaign": "lhr_mumbai" }
}
```

**Behaviour:**
- Resolves key → `clinicId`; rejects if revoked, origin not allowed, or plan lead-cap hit.
- Writes the lead scoped to that clinic; fires alerts (Pro).
- Returns `{ ok: true }` with permissive CORS for the allowed origin.
- Rate-limited per key to stop abuse.

**Captures UTM/campaign data** so your Meta/Google UA spend is attributable per lead —
useful for CAC/ROAS reporting later.

---

## 6. Embed snippet (`/embed.js`)

One line on any site:

```html
<script src="https://engine.growclinic.io/embed.js" data-key="CLINIC_KEY" defer></script>
```

It either (a) auto-binds to existing forms on the page and forwards submissions, or
(b) renders a GrowClinic booking form where you drop a `<div data-engine-form>`.
Works identically on Webflow, WordPress, and hand-coded sites — no backend needed on their end.

---

## 7. Security & compliance (do from day one)

- HTTPS only; activation keys stored hashed; origin allow-list per key.
- **Data isolation** enforced in the data layer (every query filtered by `clinicId`) —
  the single most important guarantee you're selling.
- Rate limiting + captcha option on public ingest.
- PII: leads/patients are personal data under **India's DPDP Act**. Keep encrypted
  off-server backups, a retention window, and a short data-processing note for onboarded clinics.

---

## 8. Build order (when you say go)

1. **Schema**: add `Clinic` + `ActivationKey`, add `clinicId` everywhere, backfill ELD.
2. **Data isolation layer**: scope every query by `clinicId` (middleware / Prisma helper).
3. **Ingest API + CORS + key check** + rate limit.
4. **embed.js** snippet.
5. **Plan limits** helper + Free/Pro gating.
6. **Platform admin**: create clinic, issue/revoke key, set plan.
7. Deploy to the VPS via the runbook.
