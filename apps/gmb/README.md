# Gmb — GrowClinic's Clinic Profile Operations Platform

> **Platform note (2026-09):** Gmb now runs as the `gmb` service of the
> GrowClinic Docker platform (repository root `docker-compose.yml`) on
> **PostgreSQL** (schema `gmb`, via `pg`) with the shared Redis. `mysql2`,
> `MYSQL_*` and the boot-time `schema.sql` auto-migration are gone — the schema
> lives in `database/migrations/gmb/` (MySQL originals in `db/mysql-legacy/`).
> MySQL/Hostinger references in `docs/` are historical planning notes.

> Official public subdomain: **gmb.growclinic.io**.

Gmb helps clinics and hospitals keep their Google Business Profile (GBP) accurate, active, policy-compliant, and locally discoverable. It is a paid SaaS product for healthcare businesses in India, with later expansion to the United States, Canada, Australia, and the UAE.

## V1 promise

Within 15 minutes of connecting Google, a clinic can:

1. See its verified Name, Address, Phone (NAP), profile completeness, hours, appointment URL, categories, and practitioner information.
2. Receive a transparent GBP Health Score with evidence for every score deduction.
3. Work through prioritised recommendations that improve profile accuracy, completeness, and local-search readiness.
4. Review a before/after preview and explicitly consent before Gmb changes any Google profile field.

Gmb does **not** guarantee a Google ranking or edit a clinic's protected information without the user's explicit approval.

## Product guardrails

- Supports all healthcare specialties. A hospital is managed as one facility-level GBP location in V1.
- Business name, address, primary category, hours, appointment URL, and practitioner data are protected fields. Each edit requires explicit owner consent.
- Profile edits and review replies are never auto-published in V1.
- A review is sensitive if it is one-star or contains potential malpractice, treatment/medical, or billing language. Sensitive reviews are flagged and sent to all relevant profile users for manual handling.
- Public Google review content and generated drafts are retained for 90 days. Google tokens are deleted immediately when a clinic disconnects.
- Super Admin can manage the platform, organizations, billing, compliance, and support, but cannot publish or directly modify a clinic's GBP.
- India launches first with INR pricing, Razorpay, GST invoices, and India-specific legal pages.

## Documentation

- [Product requirements](docs/v1-requirements.md)
- [Development pipeline](docs/product-pipeline.md)
- [Design system](docs/design-system.md)

## Current state

The current React/Vite application is a visual prototype. It includes a public landing page, a clinic dashboard, and a clearly labelled Super Admin demo, but has no production authentication, database, WhatsApp OTP, Google OAuth, Razorpay integration, or live Google Business Profile functionality. All in-app actions (audits, checkout, exports, publishing) are simulated and clearly labelled as previews.

The UI follows the GrowClinic brand: a light surface with GrowClinic green as the primary colour, Archivo headings and IBM Plex Sans body.

### Recent hardening pass

- Removed 5-star review-gating language; review requests now ask for honest feedback (Google-policy compliant).
- Protected-field consent is decided by each issue's structured `field`, not by matching words in its title.
- Simulated Google/payment/export actions are labelled as previews instead of reporting fake success.
- Onboarding now creates a real, complete profile (via a shared `profileFactory`) that appears in the dashboard.
- Sensitive-review classifier narrowed and switched to word-boundary matching to cut false positives.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Validation

```bash
npm run build
npm run lint
```

## Product URL

Gmb is available at **gmb.growclinic.io** as part of the GrowClinic product ecosystem.
