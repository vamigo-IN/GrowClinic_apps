# GrowClinic Engine

> **Platform note (2026-09):** Engine now runs as the `engine` service of the
> GrowClinic Docker platform (repository root `docker-compose.yml`) on
> **PostgreSQL** (schema `engine`) with **Prisma 6.3.1**. Its private MySQL /
> Nginx / Certbot kit is retired (`deploy/_superseded/`); migrations are applied
> by the platform `migrate` job (`prisma/migrations`), never `db push` at boot.
> Passwords now use scrypt (`src/lib/password.ts`). MySQL notes below are
> historical — see the root `README.md` and `ARCHITECTURE.md`.

Multi-tenant CRM SaaS for clinics — lead capture, patients, appointments — that plugs
into **any** website (Webflow, WordPress, coded) with a single **activation key**.
Free + Pro tiers. Strict per-clinic data isolation. Runs at **engine.growclinic.io**.

## Stack
Next.js 16 (App Router) · React 19 · Prisma 5 · MySQL · TypeScript

## Structure
```
prisma/schema.prisma      Clinic, ActivationKey, User, Lead (all tenant-scoped)
prisma/seed.ts            create platform admin + first clinic + activation key
src/lib/keys.ts           activation-key generation / hashing / origin allow-list
src/lib/plan.ts           Free vs Pro limits (single source of truth)
src/lib/prisma.ts         Prisma client singleton
src/app/api/ingest/lead   public lead-capture endpoint (CORS + key + plan cap)
src/app/api/health        DB health check
public/embed.js           the paste-in connector snippet for any website
deploy/                   Docker + Nginx + Certbot kit + full VPS runbook
```

## Local dev
```bash
npm install
cp .env.example .env         # point DATABASE_URL at a local MySQL
npx prisma db push
npm run seed                 # prints the ELD activation key once
npm run dev
```

## Connect a website
```html
<script src="https://engine.growclinic.io/embed.js" data-key="CLINIC_KEY" defer></script>
```
See `deploy/SAAS-ARCHITECTURE.md` for the full model and `deploy/README.md` for hosting.

## Build order (status)
- [x] Multi-tenant schema (Clinic + ActivationKey + clinicId)
- [x] Activation keys + origin allow-list
- [x] Lead ingest API (CORS + key + plan cap)
- [x] embed.js connector
- [x] Free/Pro plan limits
- [x] Deploy kit (Docker/Nginx/Certbot + runbook)
- [ ] Admin auth (session) + clinic-scoped data layer
- [ ] Admin UI: leads inbox, patients, appointments (per clinic)
- [ ] Platform admin: create clinic, issue/revoke key, set plan
- [ ] Pro alerts (WhatsApp/email) + follow-ups
```
