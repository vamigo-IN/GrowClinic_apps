// Explainable GBP audit from PUBLIC place data (Places API). This is the
// "shallow teaser" score — the deep, owner-connected score comes after OAuth.
// Every check has evidence + a recommendation so the report is trustworthy.

export const CHECKS = [
  { key: "operational", label: "Profile is live and operational", weight: 10,
    test: (p) => p.businessStatus === "OPERATIONAL",
    fail: "Your listing isn't marked operational — customers may not find or trust it.",
    fix: "Verify the profile and set status to open." },
  { key: "category", label: "Primary category set", weight: 10,
    test: (p) => !!p.primaryCategory,
    fail: "No clear primary category — Google can't match you to the right searches.",
    fix: "Set a precise primary category (e.g. Dermatologist)." },
  { key: "phone", label: "Phone number present", weight: 8,
    test: (p) => !!p.phone,
    fail: "No phone number — patients can't call to book.",
    fix: "Add a working contact number." },
  { key: "website", label: "Website / booking link present", weight: 10,
    test: (p) => !!p.website,
    fail: "No website or booking link — you lose high-intent visitors.",
    fix: "Add your website or an appointment link." },
  { key: "hours", label: "Business hours listed", weight: 8,
    test: (p) => p.hasHours,
    fail: "Hours are missing — patients don't know when you're open.",
    fix: "Add regular (and special) opening hours." },
  { key: "address", label: "Complete address", weight: 8,
    test: (p) => (p.address || "").length > 15,
    fail: "Address looks incomplete — hurts Maps ranking and directions.",
    fix: "Complete the full address with locality and pincode." },
  { key: "rating", label: "Strong average rating (4.0+)", weight: 12,
    test: (p) => (p.rating ?? 0) >= 4.0,
    fail: "Rating is below 4.0 — trust and conversion drop sharply.",
    fix: "Run an ethical review-request campaign and reply to feedback." },
  { key: "reviewVolume", label: "Healthy review volume (25+)", weight: 12,
    test: (p) => (p.reviewCount ?? 0) >= 25,
    fail: "Low review count — you look less established than competitors.",
    fix: "Collect reviews steadily (QR standee, WhatsApp requests)." },
  { key: "photos", label: "Enough photos (10+)", weight: 8,
    test: (p) => (p.photoCount ?? 0) >= 10,
    fail: "Too few photos — profiles with photos get far more clicks and calls.",
    fix: "Add clinic, team, and treatment photos regularly." },
  { key: "description", label: "Business description present", weight: 6,
    test: (p) => !!p.description,
    fail: "No description — a missed chance to build trust and add keywords.",
    fix: "Add a clear, keyword-aware description of your services." },
  { key: "categoriesDepth", label: "Multiple relevant categories", weight: 4,
    test: (p) => (p.categories || []).length >= 3,
    fail: "Few categories — you may miss adjacent searches.",
    fix: "Add relevant secondary categories for your services." },
  { key: "reviewMomentum", label: "Above-average review base", weight: 4,
    test: (p) => (p.reviewCount ?? 0) >= 50,
    fail: "Review base is modest versus category leaders.",
    fix: "Keep review velocity steady month over month." },
];

export function scoreChecks(checkDefs, subject) {
  let earned = 0, total = 0;
  const checks = checkDefs.map((c) => {
    total += c.weight;
    const passed = !!c.test(subject);
    if (passed) earned += c.weight;
    return {
      key: c.key,
      label: c.label,
      passed,
      severity: c.weight >= 10 ? "critical" : c.weight >= 7 ? "warning" : "info",
      evidence: passed ? "Looks good." : c.fail,
      recommendation: passed ? null : c.fix,
    };
  });
  const score = Math.round((earned / total) * 100);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  const issues = checks.filter((c) => !c.passed)
    .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));
  return { score, grade, checksCount: checkDefs.length, passedCount: checks.filter((c) => c.passed).length, checks, issues };
}

export function auditPlace(place) {
  return scoreChecks(CHECKS, place);
}

// Fallback score for a location that hasn't been claimed via Google yet.
// Scores ONLY the fields Gmb itself collected at signup — never invents
// review/rating/hours data the product doesn't actually have.
const PROFILE_CHECKS = [
  { key: "name", label: "Clinic name on file", weight: 8,
    test: (l) => !!l.name,
    fail: "No clinic name on file.", fix: "Add your clinic's name." },
  { key: "category", label: "Primary category on file", weight: 12,
    test: (l) => !!l.primaryCategory,
    fail: "No primary category on file — Google can't match you to the right searches.",
    fix: "Set a precise primary category (e.g. Dermatologist)." },
  { key: "address", label: "Complete address on file", weight: 12,
    test: (l) => (l.address || "").length > 15,
    fail: "No complete address on file.", fix: "Add your full clinic address." },
  { key: "phone", label: "Phone number on file", weight: 10,
    test: (l) => !!l.phone,
    fail: "No phone number on file — patients can't call to book.", fix: "Add a working contact number." },
  { key: "website", label: "Website / booking link on file", weight: 10,
    test: (l) => !!l.website,
    fail: "No website or booking link on file.", fix: "Add your website or an appointment link." },
  { key: "connected", label: "Connected to Google", weight: 12,
    test: (l) => l.status === "connected",
    fail: "Not connected to Google yet — this score only reflects what you've told us so far.",
    fix: "Connect your Google Business Profile for a live, accurate score." },
];

export function auditProfileCompleteness(location) {
  return scoreChecks(PROFILE_CHECKS, location || {});
}

// Maps the Google Business Information API location format to the audit schema
export function mapGoogleLocationToAuditFormat(gLoc) {
  return {
    businessStatus: "OPERATIONAL", // Assuming operational if we can pull it via API
    primaryCategory: gLoc.categories?.primaryCategory?.name || "",
    phone: gLoc.phoneNumbers?.primaryPhone || "",
    website: gLoc.websiteUri || "",
    hasHours: !!gLoc.regularHours,
    address: gLoc.storefrontAddress?.addressLines?.join(", ") || "",
    description: gLoc.profile?.description || "",
    categories: gLoc.categories ? [gLoc.categories.primaryCategory, ...(gLoc.categories.additionalCategories || [])] : [],
    rating: 0, // Requires Reviews API
    reviewCount: 0, // Requires Reviews API
    photoCount: 0, // Requires Photos API
  };
}
