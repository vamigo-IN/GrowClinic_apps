export interface FaqItem {
  q: string;
  a: string;
}

// Single source of truth for FAQ content, used by the visible FAQ section
// and the FAQPage structured data (JSON-LD) so the two never drift apart.
// Answers are written to be self-contained and answer-engine friendly (AEO/GEO/SEO),
// so search engines and AI assistants can quote them directly.
export const faqs: FaqItem[] = [
  {
    q: "What is healthcare digital marketing?",
    a: "Healthcare digital marketing is the practice of attracting and converting patients online using channels built for medical trust and compliance, including medical SEO, Google Business Profile and Maps visibility, Google and Meta ads, conversion-focused websites, and automated patient follow-up. Unlike generic marketing, it is engineered around how patients actually search for treatments and choose a clinic. GrowClinic builds these systems end-to-end for doctors, dentists, dermatologists, IVF centres and multispeciality hospitals.",
  },
  {
    q: "Why should I hire a specialised healthcare marketing agency instead of a general one?",
    a: "Healthcare buying decisions are high-trust, high-consideration and often regulated, so the playbooks that sell e-commerce products rarely fill an OPD. A specialised agency understands patient psychology, clinical trust signals, treatment-led search behaviour and speed-to-lead, the factors that actually drive bookings. GrowClinic focuses only on medical practices, which is why our funnels convert searches for specific treatments into booked consultations rather than just clicks.",
  },
  {
    q: "How do I choose the right healthcare marketing agency?",
    a: "Look for proven medical-niche experience, transparent reporting on cost-per-patient (not vanity metrics like impressions), a clear patient-acquisition system rather than one-off tactics, and fast, compliant lead follow-up. Ask to see how they handle speed-to-lead and attribution. GrowClinic gives every clinic a measurable growth score, department- or treatment-level pipelines, and a single dashboard tying spend to booked patients.",
  },
  {
    q: "How much does healthcare digital marketing cost in India?",
    a: "Cost depends on your city, specialty, competition and the channels you run. Most clinics invest in a monthly retainer plus a separate ad budget paid directly to Google and Meta. Rather than quoting a flat number, GrowClinic scopes investment against your target patient volume and cost per patient, so spend maps to a clear return. Start with our free clinic audit to see the realistic numbers for your market.",
  },
  {
    q: "How long does it take to see results?",
    a: "Paid acquisition (Google and Meta ads) typically begins generating verified patient enquiries within the first 1 to 2 weeks of going live, while medical SEO and Google Maps rankings compound over 3 to 6 months into a durable, lower-cost pipeline. GrowClinic runs both in parallel: ads for immediate bookings and SEO for long-term, defensible growth.",
  },
  {
    q: "What services does GrowClinic offer?",
    a: "GrowClinic offers medical SEO, Google Business Profile and local Maps optimisation, Google and Meta ad campaigns, conversion-focused clinic websites and treatment pages, WhatsApp and CRM automation for instant lead follow-up (Sync), reputation and review management, and centralised reporting. These combine into one patient-acquisition system rather than disconnected services.",
  },
  {
    q: "Which medical specialties and practices do you work with?",
    a: "GrowClinic builds growth systems for dermatology and skin clinics, dental practices, IVF and fertility centres, trichology and hair clinics, cosmetology and aesthetics clinics, and multispeciality hospitals, among others. Each system is tuned to that specialty's patients, economics and buying journey rather than using a one-size-fits-all template.",
  },
  {
    q: "How do you help clinics get more patients from Google and Google Maps?",
    a: "Most patients search by treatment and location (for example 'laser hair removal near me') and choose from the Google Maps results, so we optimise your Google Business Profile, generate consistent reviews, build local and treatment-specific landing pages, and run intent-driven ads. This makes your clinic the default choice for high-intent and 'near me' searches across your catchment area.",
  },
  {
    q: "How is AI changing the way patients find clinics, and is GrowClinic ready for it?",
    a: "Patients increasingly discover clinics through AI assistants and answer engines like ChatGPT, Google AI Overviews, Gemini and Perplexity, not just the classic blue links. GrowClinic builds for answer-engine optimisation (AEO) and generative engine optimisation (GEO), incorporating structured data, clear authoritative answers, and strong entity signals, so your clinic can be surfaced and cited across these new discovery channels as well as traditional search.",
  },
  {
    q: "What results can I expect, and are there long-term contracts?",
    a: "Clinics working with GrowClinic typically see more qualified patient enquiries, higher booking rates from faster follow-up, and a lower cost per patient as SEO and reputation compound over time. We operate on results and transparency: complex medical funnels need around 90 days to fully optimise, but we offer flexible, month-to-month engagements rather than locking you into long contracts.",
  },
];
