# Meta Account Restriction — Review Request

**Restriction:** "Can't share links" (Jun 28 → Jul 28, 2026)
**Flag:** Fraud, scams and deceptive practices — domain `growclinic.io`
**Action window:** Request review within 29 days

---

## Appeal statement (copy into the review form / appeal text box)

> Hello, I'm requesting a review of the link-sharing restriction on my account.
>
> GrowClinic (growclinic.io) is the brand of **Cloutrr Grow (OPC) Private Limited**, a company registered in India (CIN U73100UP2025OPC222487). We are a legitimate healthcare digital-marketing business that helps clinics, dentists, dermatologists and hospitals improve their online presence. The flagged link is our free, self-serve audit tool, which reviews a clinic's public Google Business Profile and website speed (using Google's own Places and PageSpeed APIs) and returns a report with practical suggestions and a 90-day growth plan. Our published Privacy Policy and Terms (with a named Grievance Officer and a "no guarantee of results" clause) are linked on the site.
>
> We do not take any payment through this tool, sell financial products, or promise guaranteed earnings. We collect only a clinic's basic business details and a WhatsApp number — with the user's consent — purely to deliver their report. Our Privacy Policy and Terms are published and linked on the page.
>
> On reviewing our landing page against your Community Standards, I have removed any wording that could be read as a misleading claim (including unverifiable statistics and absolute "guarantee"-style language), clearly labelled the on-page assistant as an AI assistant, and ensured all stated capabilities reflect exactly what the tool does.
>
> This is a genuine B2B service for medical practices and is not intended to deceive anyone. I'd be grateful for a re-review and reinstatement of link sharing. Thank you.

---

## Before you click "Request review" — do these first (IN ORDER)

1. **Verify the clean build is LIVE, not cached.** Hard-refresh `audit.growclinic.io` (Cmd+Shift+R). Footer must read **v1.26.7.F** and the headline must say *"See where your clinic can attract more patients."* If it still shows v1.7 / "500+" / "exactly where you're losing patients", the deploy didn't take — restart the Node app in hPanel and **purge the LiteSpeed/page cache** in Hostinger. (Confirmed issue: the public page was still serving the OLD deceptive copy.)
2. **Bust Meta's scraper cache.** Open the **Meta Sharing Debugger** (developers.facebook.com/tools/debug), enter `audit.growclinic.io` and `growclinic.io`, click **Scrape Again** so Meta re-reads the cleaned page instead of its cached snapshot. This step is critical — without it Meta re-reviews the stale, flagged version.
3. **Privacy & Terms** — already live and solid at `growclinic.io/privacy` and `/terms` (DPDP-compliant, registered entity, grievance officer). ✅
4. **In Meta Business Manager:** complete **Business Verification** and **Domain Verification** for growclinic.io if not already done. A verified business is far less likely to be auto-flagged.
5. **Fix the placeholder WhatsApp number.** `wa.me/15558812000` (a fake US number) still appears in the main growclinic.io site footer ("WhatsApp Us") — a broken/placeholder contact reads as a deceptive signal. Replace it with the real number (+91 97183 04212 / wa.me/919718304212).
6. Only then submit the review with the statement above.

## What was changed on the site (for your reference)

- Removed all "500+ clinics audited" claims (sidebar, trust strip, popup, report page, AI prompts).
- Replaced "find out exactly where your clinic is losing patients" with non-absolute, opportunity-framed wording.
- Replaced the fabricated "~18/month estimated patient gap" stat with an honest "Analyzing…" state.
- Relabelled the persona from "Healthcare Growth Expert" to "AI Growth Assistant".
- Changed "Live Data, Real Benchmarks" to the factual "Google & Website Data".
- Added dofollow Privacy/Terms/Home links in the footer.

## If the review is rejected

- Use **Business Help Center → Contact Support** (chat) and paste the same statement; a human reviewer can override automated flags.
- Avoid re-sharing the link repeatedly while restricted — it can extend the penalty.
