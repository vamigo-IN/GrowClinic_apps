// Content source for the data-driven specialty landing pages at /specialties/[slug].
// Add a new specialty by appending an object here, the route and sitemap pick it up automatically.

export interface SpecialtyStat {
    metric: string;
    label: string;
}

export interface SpecialtyBlock {
    title: string;
    desc: string;
}

export interface SpecialtyFAQ {
    q: string;
    a: string;
}

export interface Specialty {
    slug: string;
    name: string; // e.g. "Dermatology"
    eyebrow: string; // small label above headline
    metaTitle: string;
    metaDescription: string;
    headline: string;
    subheadline: string;
    intro: string;
    painPoints: SpecialtyBlock[];
    approach: SpecialtyBlock[];
    services: string[];
    stats: SpecialtyStat[]; // engineered outcomes we optimise for
    faqs: SpecialtyFAQ[];
}

export const specialties: Specialty[] = [
    {
        slug: "dermatology",
        name: "Dermatology",
        eyebrow: "Dermatology & Skin Clinic Marketing",
        metaTitle: "Dermatology Marketing & Patient Acquisition in India",
        metaDescription:
            "GrowClinic helps dermatologists and skin clinics attract high-intent patients for acne, laser, anti-ageing and cosmetic dermatology through SEO, Google Ads and automation.",
        headline: "Fill your chairs with high-value skin patients",
        subheadline:
            "A patient-acquisition system built for dermatology and skin clinics, engineered to convert searches for acne, laser, pigmentation and anti-ageing treatments into booked consultations.",
        intro:
            "Dermatology is one of the most searched and most competitive healthcare categories in India. Patients researching acne scars, laser hair removal, hair-fall, or anti-ageing treatments compare clinics in minutes and book the one that earns their trust first. We build the systems that make sure that clinic is yours.",
        painPoints: [
            {
                title: "High competition, low differentiation",
                desc: "Dozens of skin clinics bid on the same keywords. Without sharp positioning and a fast, trustworthy website, your ad spend funds your competitors' learning curve.",
            },
            {
                title: "Leads that never book",
                desc: "Enquiries come in on WhatsApp and forms, then go cold because no one follows up fast enough. Speed-to-lead is the single biggest leak in most dermatology clinics.",
            },
            {
                title: "Treatment-led, not clinic-led demand",
                desc: "Patients search by treatment (“laser hair removal near me”), not by clinic name. If you only rank for your brand, you are invisible to the patients actively looking to buy.",
            },
        ],
        approach: [
            {
                title: "Treatment-intent SEO",
                desc: "Dedicated pages for your highest-margin treatments and locations, optimised to rank for the searches patients actually make before booking.",
            },
            {
                title: "Performance ad campaigns",
                desc: "Google and Meta campaigns structured around procedures and cost-per-consult, not vanity clicks, with creative tuned for skin and aesthetic buyers.",
            },
            {
                title: "Instant lead follow-up",
                desc: "Our Sync automation responds to every enquiry on WhatsApp within seconds, qualifies the patient, and pushes them toward a booked appointment.",
            },
            {
                title: "Reputation that compounds",
                desc: "Automated review generation and Google Business Profile optimisation so your clinic looks like the obvious, most-trusted choice in local search.",
            },
        ],
        services: [
            "Dermatology SEO & treatment landing pages",
            "Google Ads for laser, acne & anti-ageing",
            "Meta (Instagram) campaigns for aesthetics",
            "WhatsApp lead automation (Sync)",
            "Google Business Profile & local SEO",
            "Review & reputation management",
        ],
        stats: [
            { metric: "Speed", label: "Sub-minute WhatsApp lead response" },
            { metric: "Intent", label: "Treatment-level targeting, not just brand" },
            { metric: "ROI", label: "Optimised for cost-per-consultation" },
        ],
        faqs: [
            {
                q: "Do you work with both medical and cosmetic dermatology?",
                a: "Yes. We build separate funnels for medical concerns (acne, psoriasis, hair-fall) and elective aesthetic treatments (laser, fillers, anti-ageing), because the patient psychology and economics are very different.",
            },
            {
                q: "How quickly can we expect enquiries?",
                a: "Paid campaigns can generate enquiries within the first few weeks of going live, while SEO compounds over a few months. We focus on profitable, qualified consultations rather than raw lead volume.",
            },
        ],
    },
    {
        slug: "dental",
        name: "Dental",
        eyebrow: "Dental Clinic Marketing",
        metaTitle: "Dental Clinic Marketing & Patient Acquisition in India",
        metaDescription:
            "GrowClinic helps dental clinics attract patients for implants, aligners, root canals and cosmetic dentistry through local SEO, Google Ads and automated follow-up.",
        headline: "Book more high-value dental cases, predictably",
        subheadline:
            "A growth system for dental clinics that turns local searches for implants, aligners and smile makeovers into scheduled, high-ticket appointments.",
        intro:
            "The most profitable dental treatments, implants, clear aligners, full-mouth rehab and cosmetic work, are also the most considered purchases. Patients shop around, ask for quotes, and disappear. We build the local visibility and follow-up systems that win these cases instead of losing them to the clinic down the road.",
        painPoints: [
            {
                title: "Price-shoppers and no-shows",
                desc: "High-ticket dental enquiries compare multiple clinics and frequently no-show. Without structured nurturing, you pay for leads that never sit in the chair.",
            },
            {
                title: "Weak local visibility",
                desc: "If your clinic isn't in the top map results for “dental implants near me,” you are invisible at the exact moment a patient is ready to choose.",
            },
            {
                title: "No system for recalls",
                desc: "Existing patients are your cheapest source of revenue, yet most clinics have no automated recall or reactivation system in place.",
            },
        ],
        approach: [
            {
                title: "Local & map dominance",
                desc: "Aggressive Google Business Profile and local SEO so you own the map pack for your highest-value treatments and neighbourhoods.",
            },
            {
                title: "High-ticket campaigns",
                desc: "Ad funnels built specifically around implants, aligners and smile makeovers, with messaging that pre-frames value and reduces price objections.",
            },
            {
                title: "Automated follow-up & recalls",
                desc: "Sync nurtures new enquiries and reactivates past patients over WhatsApp, cutting no-shows and reviving dormant revenue.",
            },
            {
                title: "Five-star reputation engine",
                desc: "Systematic review generation so prospective patients see a wall of recent, credible social proof before they ever call.",
            },
        ],
        services: [
            "Local SEO & Google map pack optimisation",
            "Google Ads for implants & aligners",
            "Meta campaigns for cosmetic dentistry",
            "WhatsApp follow-up & recall automation (Sync)",
            "Review & reputation management",
            "Conversion-optimised treatment pages",
        ],
        stats: [
            { metric: "Local", label: "Built to win the map pack" },
            { metric: "High-ticket", label: "Focused on implants & aligners" },
            { metric: "Recalls", label: "Automated patient reactivation" },
        ],
        faqs: [
            {
                q: "We're a single-location clinic. Is this right for us?",
                a: "Yes. Single-location clinics often see the fastest gains because dominating one local area is very achievable with focused local SEO and well-structured ads.",
            },
            {
                q: "Can you help reduce no-shows?",
                a: "That's a core part of what we do. Automated WhatsApp reminders and confirmations through Sync materially reduce no-shows for high-ticket consultations.",
            },
        ],
    },
    {
        slug: "ivf",
        name: "IVF & Fertility",
        eyebrow: "IVF & Fertility Marketing",
        metaTitle: "IVF & Fertility Clinic Marketing in India",
        metaDescription:
            "GrowClinic helps IVF and fertility centres reach intending couples with sensitive, compliant marketing, SEO, Google Ads, and confidential WhatsApp follow-up.",
        headline: "Reach intending couples with care and credibility",
        subheadline:
            "A patient-acquisition system for IVF and fertility centres that balances high-intent reach with the sensitivity, trust and discretion this journey demands.",
        intro:
            "Fertility is among the most emotional and highest-value decisions a patient will ever make. The research journey is long, private, and trust-driven. IVF marketing done badly feels intrusive; done well, it meets couples with empathy at exactly the right moment. We build systems that do the latter, and that respect the regulatory sensitivity around ART services.",
        painPoints: [
            {
                title: "A long, private decision cycle",
                desc: "Couples research for weeks or months before reaching out. Without nurturing and trust-building content, you only ever capture the small fraction ready to act today.",
            },
            {
                title: "Trust is everything",
                desc: "Success rates, doctor credentials and real stories drive the decision. A generic website with no credibility infrastructure loses to centres that demonstrate expertise.",
            },
            {
                title: "Sensitivity & compliance",
                desc: "Fertility advertising must be handled with care and within platform and regulatory guidelines. Careless campaigns get rejected or damage the brand.",
            },
        ],
        approach: [
            {
                title: "Empathy-led content & SEO",
                desc: "Educational, reassuring content that ranks for the questions couples actually search, positioning your centre as the knowledgeable, trustworthy choice.",
            },
            {
                title: "Compliant performance campaigns",
                desc: "Google and Meta campaigns crafted to meet platform health and sensitivity policies while reaching genuinely high-intent prospective patients.",
            },
            {
                title: "Confidential, gentle follow-up",
                desc: "Discreet WhatsApp follow-up through Sync that nurtures enquiries respectfully, answers questions, and guides couples toward a first consultation.",
            },
            {
                title: "Credibility infrastructure",
                desc: "Doctor profiles, success-story frameworks and reviews structured to build the trust that fertility decisions depend on.",
            },
        ],
        services: [
            "Fertility-focused SEO & educational content",
            "Compliant Google & Meta campaigns",
            "Confidential WhatsApp nurturing (Sync)",
            "Credibility & doctor-profile build-out",
            "Google Business Profile & reviews",
            "Multi-touch lead nurturing funnels",
        ],
        stats: [
            { metric: "Trust", label: "Credibility-first patient journeys" },
            { metric: "Compliant", label: "Sensitive, policy-aware campaigns" },
            { metric: "Nurture", label: "Long-cycle multi-touch follow-up" },
        ],
        faqs: [
            {
                q: "Is fertility advertising even allowed on Google and Meta?",
                a: "Yes, within specific policies and sensitivities. We structure campaigns and creative to stay compliant while still reaching intending couples effectively.",
            },
            {
                q: "How do you handle such a sensitive patient journey?",
                a: "Every touchpoint, from ad copy to WhatsApp follow-up, is written with empathy and discretion. The goal is to support couples, not pressure them.",
            },
        ],
    },
    {
        slug: "trichology",
        name: "Trichology & Hair",
        eyebrow: "Hair & Trichology Marketing",
        metaTitle: "Trichology & Hair Transplant Clinic Marketing in India",
        metaDescription:
            "GrowClinic helps trichology and hair-restoration clinics attract patients for hair-fall treatment, PRP and transplants through SEO, ads and instant WhatsApp follow-up.",
        headline: "Turn hair-loss searches into booked consultations",
        subheadline:
            "A growth system for trichology and hair-restoration clinics that captures the enormous demand for hair-fall treatment, PRP and transplants, and converts it.",
        intro:
            "Hair loss drives a massive, emotionally charged search volume, and the market is crowded with everyone from solo trichologists to large transplant chains. The clinics that win are not always the best, they are the ones that show up first, respond instantly, and build trust fastest. We engineer exactly that.",
        painPoints: [
            {
                title: "Crowded, claim-heavy market",
                desc: "Patients are bombarded with exaggerated before-and-after promises. Standing out requires credible positioning, not louder claims.",
            },
            {
                title: "Enquiries that go cold",
                desc: "Hair-fall enquiries are impulsive and comparison-driven. If you don't respond within minutes, the patient has already messaged three other clinics.",
            },
            {
                title: "Low-quality, price-only leads",
                desc: "Poorly targeted ads attract bargain-hunters. The system has to filter for patients who value outcomes, not just the lowest quote.",
            },
        ],
        approach: [
            {
                title: "Procedure-intent SEO",
                desc: "Pages built to rank for hair-fall, PRP and transplant searches in your city, capturing patients at the moment of highest intent.",
            },
            {
                title: "Qualified-lead campaigns",
                desc: "Google and Meta funnels with creative and messaging designed to attract outcome-focused patients and filter out pure price-shoppers.",
            },
            {
                title: "Instant WhatsApp response",
                desc: "Sync engages every enquiry within seconds, answers the first questions, and books the consultation before competitors even reply.",
            },
            {
                title: "Proof & reputation",
                desc: "Structured review generation and credible result presentation that builds the trust hair-loss patients need before committing.",
            },
        ],
        services: [
            "Trichology & transplant SEO",
            "Google Ads for hair-fall & PRP",
            "Meta campaigns for hair restoration",
            "Instant WhatsApp lead capture (Sync)",
            "Review & reputation management",
            "Conversion-optimised consult funnels",
        ],
        stats: [
            { metric: "Speed", label: "Seconds-fast enquiry response" },
            { metric: "Quality", label: "Outcome-focused lead filtering" },
            { metric: "Intent", label: "Procedure-level search targeting" },
        ],
        faqs: [
            {
                q: "Do you market both treatment and transplant services?",
                a: "Yes. We run distinct funnels for non-surgical treatments (PRP, medical management) and surgical transplants, since the patient intent and value differ significantly.",
            },
            {
                q: "How do you avoid attracting only cheap leads?",
                a: "Through targeting, messaging and qualification. We optimise for patients who value results, and use Sync to qualify enquiries before they reach your team.",
            },
        ],
    },
    {
        slug: "cosmetology",
        name: "Cosmetology & Aesthetics",
        eyebrow: "Cosmetology & Aesthetics Marketing",
        metaTitle: "Cosmetology & Aesthetic Clinic Marketing in India",
        metaDescription:
            "GrowClinic helps cosmetology and aesthetic clinics attract clients for skin, body and anti-ageing treatments through Instagram-led campaigns, SEO and automation.",
        headline: "Build a premium aesthetics brand that books out",
        subheadline:
            "A growth system for cosmetology and aesthetic clinics that pairs aspirational brand-building with performance marketing, so you attract premium clients, not discount-seekers.",
        intro:
            "Aesthetics is a brand-and-trust business. Clients buy confidence, and they buy from clinics that look the part on Instagram, rank on Google, and respond like a luxury service. We combine aspirational social presence with hard-nosed performance marketing to fill your calendar with the right clientele.",
        painPoints: [
            {
                title: "Brand looks don't match the price point",
                desc: "Premium treatments need a premium digital presence. A dated website or thin Instagram undermines the prices you want to charge.",
            },
            {
                title: "Discount-driven demand",
                desc: "Offer-led marketing trains the market to wait for deals and attracts clients who never return at full price. Positioning has to lead with value.",
            },
            {
                title: "Inconsistent bookings",
                desc: "Without a system, bookings swing between feast and famine. Predictable growth needs an always-on acquisition engine, not occasional ad bursts.",
            },
        ],
        approach: [
            {
                title: "Aspirational brand & social",
                desc: "Instagram-first content and brand positioning that signals premium quality and makes your clinic the aspirational choice in your city.",
            },
            {
                title: "Performance campaigns",
                desc: "Meta and Google funnels engineered for treatment bookings and a healthy cost-per-acquisition, balanced with brand-building reach.",
            },
            {
                title: "Concierge-style follow-up",
                desc: "Sync delivers fast, polished WhatsApp responses that match the premium experience clients expect, converting interest into appointments.",
            },
            {
                title: "Retention & rebooking",
                desc: "Automated rebooking and membership nurturing that turns one-off treatments into recurring, high-lifetime-value clients.",
            },
        ],
        services: [
            "Aesthetics brand & Instagram strategy",
            "Meta & Google performance campaigns",
            "Aesthetic SEO & treatment pages",
            "Concierge WhatsApp booking (Sync)",
            "Rebooking & retention automation",
            "Review & reputation management",
        ],
        stats: [
            { metric: "Premium", label: "Positioning over discounting" },
            { metric: "Always-on", label: "Predictable booking pipeline" },
            { metric: "LTV", label: "Retention & rebooking built in" },
        ],
        faqs: [
            {
                q: "Will marketing cheapen our premium brand?",
                a: "Not the way we do it. We lead with value and aspiration rather than discounts, protecting your price point while still driving consistent bookings.",
            },
            {
                q: "Do you manage our Instagram as well?",
                a: "We build the strategy, content direction and ad campaigns that make Instagram a genuine booking channel rather than a vanity feed. Scope is agreed in your proposal.",
            },
        ],
    },
    {
        slug: "hospital",
        name: "Hospital",
        eyebrow: "Multispeciality Hospital Marketing",
        metaTitle: "Multispeciality Hospital Marketing & Patient Acquisition in India",
        metaDescription:
            "GrowClinic helps multispeciality hospitals grow OPD footfall and high-value departments through medical SEO, Google Ads, local visibility and patient-flow automation.",
        headline: "Grow OPD footfall across every department",
        subheadline:
            "A patient-acquisition system built for multispeciality hospitals, engineered to fill OPDs, route enquiries to the right department, and grow your highest-value service lines.",
        intro:
            "A hospital is many practices under one roof, each with its own patients, competitors and economics. Marketing one specialty well is hard; marketing a dozen at once, while keeping the brand consistent and the call centre sane, is harder. We build a centralised acquisition engine that grows every department and routes each enquiry to the right place.",
        painPoints: [
            {
                title: "Departments compete for the same budget",
                desc: "Cardiology, ortho, oncology and maternity all want visibility. Without a system, spend is spread thin and no line gets enough momentum to scale.",
            },
            {
                title: "Enquiries get lost between departments",
                desc: "A general enquiry line means leads bounce, wait, or reach the wrong desk. Slow, mis-routed follow-up is the biggest leak in hospital marketing.",
            },
            {
                title: "Strong reputation, weak digital shelf",
                desc: "Trusted hospitals often rank below smaller, sharper competitors because their site, Google profile and department pages aren't engineered for search.",
            },
        ],
        approach: [
            {
                title: "Department-level demand capture",
                desc: "SEO and ad funnels per high-value service line — cardiac, ortho, oncology, maternity, neuro — so each department gets its own pipeline, not a shared trickle.",
            },
            {
                title: "Local & Maps dominance",
                desc: "Google Business Profile, reviews and local SEO that make your hospital the default choice for 'near me' and emergency-intent searches across your catchment.",
            },
            {
                title: "Smart enquiry routing",
                desc: "Sync captures every enquiry and routes it to the correct department instantly over WhatsApp, so no high-value lead waits or lands at the wrong desk.",
            },
            {
                title: "Centralised reporting",
                desc: "One dashboard across departments — cost per enquiry, OPD bookings and ROI by service line — so leadership can fund what works and scale predictably.",
            },
        ],
        services: [
            "Department-level medical SEO",
            "Google & Meta Ads by service line",
            "Local SEO, Maps & reviews",
            "Enquiry routing & WhatsApp automation (Sync)",
            "Conversion-focused department pages",
            "Centralised multi-department reporting",
        ],
        stats: [
            { metric: "Per-dept", label: "Pipelines, not a shared trickle" },
            { metric: "Routed", label: "Every enquiry to the right desk" },
            { metric: "Local", label: "Maps & 'near me' dominance" },
        ],
        faqs: [
            {
                q: "Can you market multiple departments at once?",
                a: "Yes. We build a centralised engine with its own funnel per high-value service line, so cardiology, ortho, maternity and more each grow in parallel without competing for one shared budget.",
            },
            {
                q: "How do you handle enquiries across departments?",
                a: "Our Sync layer captures every call, form and WhatsApp enquiry and routes it to the correct department instantly, so no high-value patient waits or reaches the wrong desk.",
            },
        ],
    },
];

export function getSpecialty(slug: string): Specialty | undefined {
    return specialties.find((s) => s.slug === slug);
}
