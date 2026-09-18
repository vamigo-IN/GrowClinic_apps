# GrowClinic — Enhancement Roadmap (Site + Audit Tool as One Funnel)

**Prepared for:** Aman · **Date:** 7 Aug 2026
**Scope:** `www.growclinic.io` (Next.js marketing site) + `audit.growclinic.io` (Express audit tool), treated as a single lead journey.
**Lens:** Conversion & UX · Launch hardening · Trust & polish · Tracking & attribution — for both audiences (clinic owners/leads *and* the internal team using admin).
**Deliverable:** prioritized findings only. No code changed yet.

---

## Executive Summary

This is not a rough prototype. Both apps are mature and carefully engineered — the audit tool is a 6,100-line Express funnel with RBAC (7 roles), 2FA, brute-force lockout, resilient webhook retry queues, Google Calendar OAuth sync, international OTP/email verification, and server-side Meta CAPI. The Next.js site has a full CMS, role-based admin, SEO plumbing, and a token-based PII-safe handoff. The engineering quality is high and the CHANGELOG shows disciplined iteration.

The gap to "ready for ideal users" is therefore **not** feature depth. It's three things: (1) the two apps are instrumented as **two separate analytics islands**, so the one-funnel view you actually manage against is broken at the domain handoff; (2) a handful of **launch-hardening loose ends** (hardcoded secrets, incomplete env docs, junk files) that will bite a new operator or a security reviewer; and (3) **conversion-surface polish** — the moments where a non-technical, mobile, time-poor clinic owner decides to keep going or bounce.

The single highest-leverage fix is **unifying attribution across the two domains** — without it, every CAC, ROAS and payback number you compute is understating the audit tool's contribution and mis-crediting channels. Everything else is optimization on top of a measurement layer you can't yet trust.

---

## Key Insights

- **The funnel is two codebases but one customer journey.** A visitor lands on `www.growclinic.io`, and the money moment (verified lead) happens on `audit.growclinic.io`. Attribution, session continuity and event naming must be identical across both — today they are not.
- **Verification is the conversion mechanic, and it's already smart.** Report unlocks only after WhatsApp OTP (India) or email OTP (rest of world), but the email is captured the instant it's typed so no lead is lost on "verify later." That's a genuinely good design — protect it, don't touch it.
- **The teaser gate is where India leads convert or die.** Unverified India visitors see a 10% teaser (score + biggest gap). The persuasiveness of that teaser and the friction of the OTP step are the two biggest conversion levers in the whole system.
- **The internal team is a first-class user here.** Callers, managers, auditors and marketers live in the admin dashboards. "Ready for ideal users" includes *them* — SLA visibility, lead freshness, and click-to-WhatsApp speed drive whether leads actually get worked.
- **Server-side CAPI is live, but the browser side of the dedup is unverified.** Meta CAPI fires on lead capture, but I found no client-side `fbq('track','Lead')` with a matching `event_id` in the public audit funnel — so Meta may be under-attributing or the dedup may be one-legged.

---

## Problems (grouped by dimension)

### A. Tracking & Attribution — *the priority cluster*

> **Correction after code review (7 Aug):** two items in the first draft were wrong and are corrected below. The Pixel `Lead` + CAPI deduplication **is** already implemented correctly, and GA4 across `www.` ↔ `audit.` is a **same-registrable-domain** case (shared cookie), not a cross-domain-linker case. The real issues are property alignment and a duplicate GTM tag.

1. **GA4 property alignment across subdomains (not a linker problem).** `www.growclinic.io` and `audit.growclinic.io` are subdomains of the same registrable domain, so GA4 shares the client-ID cookie (`.growclinic.io`) across them **automatically** — *provided both send to the same GA4 property*. The site defaults to `G-G0S3YVHX7S`; the audit tool's `GA4_ID` is set in its own admin panel. **Action:** confirm the audit tool's `GA4_ID` equals `G-G0S3YVHX7S`, and add `audit.growclinic.io` / `www.growclinic.io` to that property's Data Stream so neither shows up as a self-referral. No linker code needed.
2. **Duplicate GTM container on the audit tool.** `public/index.html` hardcodes `GTM-KPCL7JZ9` in `<head>`, *and* `server.js` injects a second GTM container from the admin `GTM_ID` setting (line 481). If `GTM_ID` is populated, every page loads **two containers** → duplicated PageViews and possibly double-fired conversions. **Decision needed:** keep only one. Recommended: remove the hardcoded block from `index.html` and manage GTM via the admin setting (the "no-redeploy" pattern the app is built around) — but only after confirming `GTM_ID` is set to `GTM-KPCL7JZ9` in admin, else GTM would drop entirely.
3. **~~Browser Pixel `Lead` not firing~~ — RESOLVED, already correct.** `gcTrack` (server-injected) fires `fbq('track','Lead', p, {eventID:'lead_'+sessionId})` on `lead_captured`, and the server CAPI sends the matching `eventId: 'lead_'+sessionId`. Deduplication is sound. **Only action:** confirm `META_PIXEL_ID` and `META_CAPI_TOKEN` are set in admin so both legs actually fire.
4. **Click-ID pass-through exists but isn't verified end-to-end.** The audit tool captures `gclid`/`fbclid` and the webhook carries `attribution.clickId`, but there's no confirmation the site→audit handoff forwards `gclid`/`fbclid`/`utm_*` on every path (form handoff vs direct link vs "verify later" resume). Worth a live trace.
5. **No offline-conversion loopback for the *verified* lead.** Verified leads (the real conversion) aren't being pushed back to Google Ads (offline conversions) or Meta CAPI with the *verified* signal — so ad platforms optimize toward form-fills, not toward verified, contactable leads. This remains the biggest growth unlock.

### B. Launch Hardening

5. **Hardcoded default maintenance bypass code** (`5402498`) in `server.js`. Ships as a working backdoor if never overridden.
6. **`.env.example` is dangerously incomplete.** Root example lists only `OPENAI_API_KEY` + `GOOGLE_API_KEY`, but the README/code require Gemini, WhatsApp (GetGabs), MySQL, `WEBHOOK_URL`, SMTP, etc. A new deploy will silently half-work. Same risk on the Next side (`AUDIT_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, Cloudinary).
7. **CORS defaults to `localhost`.** Correct default, but means a forgotten `PUBLIC_ORIGIN` in prod silently blocks the browser — an easy launch-day outage.
8. **Handoff "signature" is a static shared secret, not an HMAC.** `X-GrowClinic-Signature` sends the raw secret (README even calls it "HMAC-style"). It's replayable and, if logged anywhere, leaks. Should be an HMAC of the payload + timestamp.
9. **Leftover FUSE junk files committed** — two ~175KB `.fuse_hidden*` copies of `admin.html` in `public/` (served as static!) and four in the Next `api/posts/` tree. The `public/` ones are a data-exposure and stale-code risk; all should be removed and gitignored.
10. **Cross-app auth/RBAC is duplicated, not shared.** Two separate admin systems, two user tables, two role models (7 roles vs 3). Fine for now, but it's double the surface to harden and audit, and staff need two logins.

### C. Conversion & UX (lead-facing)

11. **OTP friction is the biggest drop-off risk.** Every extra field, unclear country code, or "didn't get the code" dead-end loses a verified lead. Needs a hard look at retry/resend UX, WhatsApp-vs-email clarity, and the fallback path.
12. **Teaser persuasiveness is untested.** The 10% teaser is the paywall. Is it showing the *most* alarming, specific gap? Is there a countdown/scarcity or social proof at the unlock moment? This is the #1 A/B test target.
13. **~150-second audit length vs mobile attention.** Good in theory; needs progress reassurance and a visible payoff preview so mobile users don't abandon mid-audit.
14. **Site CTAs may not carry attribution into the audit.** If the `/audit` CTA or WhatsApp CTA drops UTMs/click-IDs, paid traffic arrives at the audit tool as "direct."

### D. Trust & Polish (both audiences)

15. **Two visual languages.** Site (Tailwind, Framer Motion, light/dark) vs audit tool (glass WhatsApp UI). At the handoff the user crosses a visual seam — brand consistency at that exact moment affects trust and completion.
16. **Loading/empty/error states at API-dependent moments** (GMB lookup, PageSpeed cap at 25s, report generation). Non-technical users need "we're working on it" reassurance, not a spinner that looks stuck.
17. **Admin operator ergonomics.** SLA badges and newest-first sorting already exist (good). Worth confirming callers get one-tap WhatsApp/call, lead freshness is obvious, and nothing important is buried for the roles that actually work leads.

---

## Growth Opportunities

- **Verified-lead offline conversions → Google Ads & Meta.** Feed the *verified* event back to ad platforms so they optimize for contactable leads, not raw fills. Typically the single biggest ROAS unlock for a lead-gen funnel — it changes what the algorithm buys.
- **Teaser → unlock as a dedicated experiment surface.** Build event-level tracking of teaser-view → OTP-start → OTP-verify → report-unlock so you can compute step conversion and test teaser variants. This is where incremental verified leads come cheapest.
- **Channel-quality scoring on downstream events, not installs.** Since every completed audit is a verified lead, score publishers/campaigns on *verified-lead rate* and *report-unlock rate*, not visits. Prioritize quality traffic over cheap traffic.
- **Automated daily funnel digest** (visits → audits started → completed → verified → unlocked, by source) to admin/Slack via the existing webhook layer — so the team manages against the funnel every morning.
- **WhatsApp re-engagement for "verify later" leads.** They're captured but unverified — a timed WhatsApp nudge (you already have the API) recovers a measurable slice.

---

## Recommended Actions

**Do first (this week):**
- Configure GA4 cross-domain linking for both domains; align GTM event taxonomy across site + tool; verify UTM/gclid/fbclid survive the handoff on every path.
- Add browser `fbq('track','Lead')` with a shared `event_id` matching the server CAPI event; confirm dedup in Events Manager.
- Remove the hardcoded maintenance code (force env-only); complete both `.env.example` files; add a prod `PUBLIC_ORIGIN` preflight check that fails loudly.
- Delete all `.fuse_hidden*` files; add to `.gitignore`; confirm none are served from `public/`.

**Do next (weeks 2–3):**
- Wire verified-lead offline conversions to Google Ads + Meta CAPI (verified signal).
- Instrument the teaser→unlock funnel and launch the first teaser A/B test.
- Convert the handoff secret to a timestamped HMAC.
- Tighten OTP UX (resend timer, channel clarity, fallback) and audit CTA attribution on the site.

**Do after (week 4+):**
- Brand-continuity pass across the handoff seam; loading/empty/error states.
- Daily funnel digest automation; verify-later WhatsApp re-engagement.
- Evaluate a shared auth/session or SSO between the two admins.

---

## Priority Matrix (Impact × Effort)

| # | Item | Dimension | Impact | Effort | Priority |
|---|------|-----------|--------|--------|----------|
| 1 | GA4 cross-domain + unified event taxonomy | Tracking | High | Low | **P0** |
| 2 | Browser Pixel `Lead` + CAPI dedup (event_id) | Tracking | High | Low | **P0** |
| 5 | Remove hardcoded maintenance code | Hardening | High | Low | **P0** |
| 9 | Remove `.fuse_hidden` files from `public/` | Hardening | High | Low | **P0** |
| 6 | Complete both `.env.example` files | Hardening | Med | Low | **P0** |
| 4 | Verified-lead offline conversions to Ads/Meta | Growth | High | Med | **P1** |
| 12 | Teaser→unlock instrumentation + A/B test | Conversion | High | Med | **P1** |
| 11 | OTP friction / resend / fallback UX | Conversion | High | Med | **P1** |
| 3 | Verify click-ID pass-through on all paths | Tracking | Med | Low | **P1** |
| 7 | Prod `PUBLIC_ORIGIN` preflight guard | Hardening | Med | Low | **P1** |
| 14 | Site CTA attribution into audit | Tracking | Med | Low | **P1** |
| 8 | HMAC the handoff signature | Hardening | Med | Med | **P2** |
| 15 | Brand continuity across handoff seam | Trust | Med | Med | **P2** |
| 16 | Loading/empty/error states | Trust | Med | Med | **P2** |
| 13 | Mid-audit reassurance for mobile | Conversion | Med | Med | **P2** |
| 17 | Admin operator ergonomics review | Trust (internal) | Med | Low | **P2** |
| 10 | Shared auth/SSO across both admins | Hardening | Low | High | **P3** |

---

## Expected Impact

- **P0 tracking fixes** don't add leads directly — they make every downstream number *true*. Expect reported audit-tool conversions to rise simply because they stop being mis-attributed to "referral/direct," and Meta CPL to improve once the Pixel/CAPI dedup is clean.
- **Verified-lead offline conversions (P1)** typically deliver the largest ROAS gain of anything here — the algorithm starts buying contactable leads instead of form-fills. This is the item most likely to move CAC and payback.
- **Teaser + OTP conversion work (P1)** compounds on every paid click you already buy — incremental verified leads at zero extra media spend.
- **P0 hardening** is pure risk reduction: closes a backdoor, prevents a silent launch-day outage, and removes stale code from a public directory.

---

## Open Questions for You

1. Are `www.growclinic.io` and `audit.growclinic.io` both **live in production now**, or is this a pre-launch hardening pass? (Changes whether P0 is "fix the leak today" vs "before we flip live.")
2. Which markets are actively running paid traffic right now — India only, or AE/US/UK/CA too? (Determines whether OTP-vs-email verification UX is the priority surface.)
3. Do you want me to proceed by **implementing the P0 block** (all low-effort, high-impact), or produce a detailed technical spec for the tracking unification first?
