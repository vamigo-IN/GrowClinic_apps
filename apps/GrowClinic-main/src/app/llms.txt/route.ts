// Serves /llms.txt — a concise, LLM-friendly map of the site (llmstxt.org format).
export const dynamic = "force-static";

const BASE = "https://www.growclinic.io";

const CONTENT = `# GrowClinic

> GrowClinic is a healthcare growth agency that builds patient-acquisition systems for doctors, dentists, dermatologists and clinics worldwide. We combine medical SEO, Google Maps/local visibility, paid ads, website conversion and automation to turn local searches into booked patients. GrowClinic is a brand of Cloutrr Grow (OPC) Private Limited.

## Core pages
- [Home](${BASE}/): Overview of GrowClinic's healthcare marketing and patient-acquisition systems.
- [About](${BASE}/about): Who we are, our approach, and the team behind GrowClinic.
- [Digital Marketing for Clinics](${BASE}/digital-marketing-for-clinics): How clinics get more patients through SEO, Google Ads, and local visibility.
- [Specialties](${BASE}/specialties): Marketing tailored to dental, dermatology, IVF, and other specialties.
- [Clinic Growth Audit](${BASE}/audit): Interactive audit of a clinic's online visibility, site speed and booking flow, with a 90-day plan.

## Services & proof
- [Services](${BASE}/#services): Medical SEO, Google Ads, website/conversion, automation and retention.
- [Results](${BASE}/#results): Measured growth outcomes for clinics.
- [Success Stories](${BASE}/testimonials): Client testimonials and case studies.
- [FAQ](${BASE}/faq): Common questions about clinic marketing and how we work.

## Content
- [Blog](${BASE}/blog): Articles on healthcare marketing, SEO, and clinic growth.

## Contact
- [Contact](${BASE}/contact): Get in touch or book a strategy session.
- Email: hi@growclinic.io
- Call: +91 72877 74212 (WhatsApp available on the site)

## Legal
- [Privacy Policy](${BASE}/privacy)
- [Terms & Conditions](${BASE}/terms)
- [Refund & Cancellation](${BASE}/refund)
`;

export function GET() {
    return new Response(CONTENT, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
