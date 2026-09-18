// Service categories for the portfolio-style Case Studies page.
// Each case study is tagged with one `key`; the public page groups studies
// under these sections (in `order`) and shows the heading, description and
// tagline — mirroring a service-grouped agency portfolio.
//
// To add a new service, append an entry here — the admin dropdown and the
// public page both read from this list, so no other change is needed.

export interface CaseStudyCategory {
    key: string;
    label: string;
    kicker: string;      // short all-caps eyebrow, e.g. "META"
    description: string; // paragraph shown under the section heading
    tagline: string;     // one-line italic tagline
}

export const CASE_STUDY_CATEGORIES: CaseStudyCategory[] = [
    {
        key: "meta-ads",
        label: "Meta Ads",
        kicker: "META",
        description:
            "We turn Facebook and Instagram into a steady stream of patients. Compliant Meta campaigns with precise targeting, proven creatives, lead-form funnels, and conversion tracking. Continuous A/B tests, negative audiences, and budget pacing lower cost-per-lead while protecting your brand — every rupee tied to booked appointments, not vanity metrics.",
        tagline: "Smart targeting, real patients — campaigns that turn social media into bookings.",
    },
    {
        key: "google-ads",
        label: "Google Ads",
        kicker: "GOOGLE",
        description:
            "High-intent patients today, not someday. We run compliant Google and YouTube campaigns with airtight targeting, negative keywords, conversion tracking, and landing pages built for speed. Continuous A/B tests, call tracking, and lead triage improve cost-per-lead while protecting your budgets and clinical claims — with transparent dashboards.",
        tagline: "Every click counts — paid traffic that actually converts.",
    },
    {
        key: "seo",
        label: "Search Engine Optimization",
        kicker: "SEO",
        description:
            "We build search visibility that converts to appointments. From medical keyword research and on-page fixes to local citations, schema, and authoritative backlinks, we rank your specialities where patients search. Transparent tracking, competitor audits, and steady compounding growth — you own traffic, not rent it, month after month.",
        tagline: "Built to rank and retain — visibility that fills your calendar.",
    },
    {
        key: "gbp",
        label: "Google Business Profile",
        kicker: "GBP",
        description:
            "We turn your Google Business Profile into a patient-booking engine. We fix NAP, categories, services, and visuals; craft weekly posts; answer Q&As; and track calls, directions, and website clicks. Local SEO sprints, review velocity, and geo-content help you dominate Maps across the neighbourhoods you actually serve.",
        tagline: "From invisible to unmissable — GMB as a patient magnet.",
    },
    {
        key: "website",
        label: "Website Design & Development",
        kicker: "WEB",
        description:
            "Fast, modern, conversion-first medical websites. Accessible UX, crisp service pages, doctor profiles, FAQs, reviews, and schema — built on secure tech with blazing performance, WhatsApp click-to-chat, appointment forms, and tracking. Every visitor finds answers and books confidently, from day one.",
        tagline: "More than good looks — websites that convert clicks into appointments.",
    },
    {
        key: "social",
        label: "Social Media Marketing",
        kicker: "SOCIAL",
        description:
            "We build clinic reputation through high-value healthcare content and community engagement. Consistent, compliant posting, short-form video, and story-led campaigns keep your practice top-of-mind and trusted — turning followers into patients.",
        tagline: "Content that builds trust and keeps your clinic top-of-mind.",
    },
    {
        key: "graphics",
        label: "Graphic Design",
        kicker: "DESIGN",
        description:
            "Scroll-stopping, on-brand creative for clinics — ad creatives, carousels, reels covers, brochures, and patient-education visuals. Every asset is designed to build trust and drive action, consistent across every channel you run.",
        tagline: "Design that earns attention and builds a premium clinic brand.",
    },
    {
        key: "ai-automation",
        label: "AI Automation",
        kicker: "AI",
        description:
            "We wire AI into your patient journey — instant WhatsApp replies, lead qualification, follow-up sequences, review requests, and reporting. Fewer missed enquiries, faster response, and a team freed from repetitive work, so no lead ever goes cold.",
        tagline: "Automation that captures every lead and follows up in seconds.",
    },
    {
        key: "content",
        label: "Content Marketing",
        kicker: "CONTENT",
        description:
            "Authority-building healthcare content — blogs, treatment pages, FAQs, and video scripts written for both patients and search engines. We turn your expertise into a compounding library that ranks, educates, and converts.",
        tagline: "Content that ranks, educates, and turns readers into patients.",
    },
];

export const CASE_STUDY_CATEGORY_MAP: Record<string, CaseStudyCategory> = Object.fromEntries(
    CASE_STUDY_CATEGORIES.map((c) => [c.key, c])
);

// Resolve the service keys for a case study. Prefers the multi-value `services`
// (comma-separated), falling back to the legacy single `category`. Returns only
// keys that exist in the registry, de-duped and in registry order.
export function serviceKeysFor(cs: { services?: string | null; category?: string | null }): string[] {
    const raw = (cs.services && cs.services.trim())
        ? cs.services.split(",")
        : (cs.category ? [cs.category] : []);
    const set = new Set(raw.map((s) => s.trim()).filter((s) => CASE_STUDY_CATEGORY_MAP[s]));
    return CASE_STUDY_CATEGORIES.filter((c) => set.has(c.key)).map((c) => c.key);
}

// Parse the `metrics` textarea into headline stats. Each line is "Value | Label"
// (e.g. "2,356 | Conversations started"). Lines without a "|" are ignored so a
// stray note never breaks the layout. Returns [{ value, label }].
export interface Metric { value: string; label: string; }
export function parseMetrics(raw: string | null | undefined): Metric[] {
    if (!raw) return [];
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const idx = line.indexOf("|");
            if (idx === -1) return null;
            const value = line.slice(0, idx).trim();
            const label = line.slice(idx + 1).trim();
            if (!value || !label) return null;
            return { value, label };
        })
        .filter((m): m is Metric => m !== null)
        .slice(0, 6);
}
