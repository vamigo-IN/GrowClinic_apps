# GrowClinic.io — Healthcare Growth Agency

GrowClinic builds patient-acquisition systems for doctors, dentists, dermatologists and clinics worldwide — combining medical SEO, Google Maps/local visibility, paid ads, conversion-focused websites and automation to turn local searches into booked patients.

GrowClinic is a brand of **Cloutrr Grow (OPC) Private Limited** (CIN: U73100UP2025OPC222487).

## 🚀 What's in this app

- **Marketing site** — Home, About, Digital Marketing for Clinics, per-specialty landing pages, Blog, Projects, Testimonials, FAQ, Contact, and legal pages.
- **Sync** — marketing pages for the WhatsApp automation product (bookings, prescriptions, billing).
- **Clinic Growth Audit** — a `/audit` landing page plus a secure, token-based handoff that hands the lead to the separate audit tool (`audit.growclinic.io`) without putting PII in the URL.
- **Admin dashboard** (`/admin`) — a dark, role-based control panel:
  - **RBAC** (admin / manager / viewer) with user management.
  - **Inquiries** & **Audit Submissions** tables (search, date filters, CSV export, source labels, webhook status).
  - **Blog / Projects / Testimonials** CMS.
  - **Integrations & Tracking** — live status for GA4, GTM, Meta Pixel, Microsoft Clarity, Google Search Console and Bing, with real provider pings (not just string matching).
  - Light/dark theme toggle.
- **Tracking** — GA4, Microsoft Clarity, optional GTM/Meta Pixel, plus Google/Bing site verification.
- **SEO** — dynamic `sitemap.xml`, `robots.txt`, JSON-LD structured data and an `llms.txt` site map for AI assistants.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 (CSS variables for theming)
- **Database**: Prisma 6 with **MySQL**
- **Auth**: NextAuth v5 (JWT strategy, credentials provider, bcrypt)
- **Animations**: Framer Motion · **Icons**: Lucide React
- **Hosting**: Hostinger (Node), auto-deploys from the `main` branch on GitHub

## 📦 Getting Started

### Prerequisites
- Node.js 20+
- A MySQL database

### Installation
```bash
git clone https://github.com/vamigo-IN/GrowClinic.git
cd GrowClinic
npm install
```

Create a `.env` file in the root:
```env
DATABASE_URL="mysql://user:pass@host:3306/dbname?connection_limit=5&pool_timeout=20&connect_timeout=15"
NEXTAUTH_SECRET="your-secret"            # also accepted as AUTH_SECRET
NEXT_PUBLIC_APP_URL="https://www.growclinic.io"

# Optional integrations
AUDIT_WEBHOOK_SECRET="shared-secret-with-audit-tool"
GOOGLE_SITE_VERIFICATION="..."           # GSC meta-tag method (file method also in /public)
BING_SITE_VERIFICATION="..."
GOOGLE_API_KEY="..."                     # Maps / PageSpeed (if used)
```

Initialise the database and run:
```bash
npx prisma generate
npx prisma db push
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Schema changes in production
Production runs on Hostinger MySQL. Schema additions (e.g. the `User.role` column) are applied with a one-off `ALTER TABLE` in phpMyAdmin **before** deploying the code that depends on them, then `prisma generate` runs as part of the Hostinger build. Migration SQL lives in `~/Desktop/growclinic-setup/`.

## 📈 Tracking & Advertising

Analytics and ad tags are managed from **Admin → Integrations & Tracking** (GA4, GTM, Meta Pixel) — saving re-injects them site-wide via `TrackingScripts`, and the page live-pings each provider to confirm it's working. GA4 (`G-G0S3YVHX7S`) and Microsoft Clarity are on by default; add a **Meta Pixel** there before running Meta/Instagram ads, and import GA4 conversions into Google Ads (or add a Google Ads tag via GTM).

Ad landing pages — `/digital-marketing-for-clinics`, `/audit`, the per-specialty pages and the audit tool (`audit.growclinic.io`) — are crawlable (AdsBot-Google is allowed in `robots.txt`) and listed in `sitemap.xml`. Personalised audit reports are `noindex` by design.

## ⚡ Performance & reliability

Public content pages (`/blog`, `/blog/[slug]`, `/blog/category/*`, `/testimonials`,
`/case-studies`, `/case-studies/[slug]`, `sitemap.xml`) are **ISR-cached**
(`export const revalidate`), not rendered per request. This is deliberate: on
shared MySQL a `force-dynamic` page hits the DB on every visit — including bot
and crawler traffic — which exhausts the connection pool, 500s the page, and
trips the host health check into restarting the app. Caching collapses that to
one render per revalidate window.

Two things keep the cache correct and the DB safe:

- **`DATABASE_URL` must set `connection_limit`** (see `.env.example`). Without it
  Prisma uses a default pool that overruns Hostinger's connection cap.
- **Mutations bust the cache.** Post / case-study / testimonial create, update
  and delete call `revalidatePath` via `src/lib/revalidate.ts`, so edits appear
  immediately instead of waiting for the window.

**Scheduled publishing** no longer runs inside page renders. `/api/health`
(hit every minute by the external keep-warm pinger) flips any due scheduled
posts live and revalidates `/blog`. Keep that pinger configured, or scheduled
posts only publish when `/blog` next revalidates (≤5 min).

## 📜 License

Private — all rights reserved by GrowClinic.io / Cloutrr Grow (OPC) Private Limited.
