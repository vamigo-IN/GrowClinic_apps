import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAuditReportWhatsApp } from "@/lib/whatsapp";
import { sendAuditWebhook } from "@/lib/audit-webhook";
import { text } from "@/lib/input";

// ─── City Tier Classification ───────────────────────────────────────────────
const TIER_1_CITIES = new Set([
  "mumbai", "delhi", "new delhi", "bangalore", "bengaluru", "hyderabad",
  "chennai", "kolkata", "pune", "ahmedabad",
]);

const TIER_2_CITIES = new Set([
  "jaipur", "lucknow", "indore", "noida", "gurgaon", "gurugram",
  "chandigarh", "bhopal", "nagpur", "coimbatore", "kochi", "visakhapatnam",
  "thiruvananthapuram", "vadodara", "surat", "nashik", "patna", "ranchi",
  "dehradun", "guwahati", "bhubaneswar", "mysore", "mysuru", "mangalore",
  "mangaluru", "ludhiana", "amritsar", "agra", "varanasi", "kanpur",
  "madurai", "rajkot", "jodhpur", "gwalior", "raipur", "faridabad",
  "meerut", "jabalpur", "vijayawada", "thane", "navi mumbai", "ghaziabad",
  "greater noida",
]);

function getCityTier(city: string): 1 | 2 | 3 {
  const normalized = city.toLowerCase().trim();
  if (TIER_1_CITIES.has(normalized)) return 1;
  if (TIER_2_CITIES.has(normalized)) return 2;
  return 3;
}

// ─── Specialization Competitiveness Index ───────────────────────────────────
// Higher = more competitive = harder to rank
const SPECIALIZATION_INDEX: Record<string, number> = {
  "Dentist": 0.92,
  "Dermatologist": 0.78,
  "Orthopedic": 0.62,
  "IVF": 0.50,
  "Gynecologist": 0.82,
  "Pediatrician": 0.74,
  "Ophthalmologist": 0.55,
  "ENT": 0.48,
  "Cardiologist": 0.58,
  "Neurologist": 0.45,
  "Urologist": 0.42,
  "Psychiatrist": 0.40,
  "Physiotherapist": 0.65,
  "Ayurveda": 0.60,
  "Homeopathy": 0.55,
  "General Physician": 0.70,
  "Cosmetic Surgeon": 0.68,
  "Oncologist": 0.35,
  "Other": 0.50,
};

function getCompetitiveness(specialization: string): number {
  return SPECIALIZATION_INDEX[specialization] ?? 0.50;
}

// ─── Average Monthly Search Volume Estimates ────────────────────────────────
// Approximate searches/mo for "{specialization} near me" by city tier
const SEARCH_VOLUME: Record<string, Record<number, number>> = {
  "Dentist":          { 1: 12000, 2: 4500, 3: 800 },
  "Dermatologist":    { 1: 8500,  2: 3200, 3: 600 },
  "Orthopedic":       { 1: 5500,  2: 2100, 3: 400 },
  "IVF":              { 1: 4000,  2: 1500, 3: 250 },
  "Gynecologist":     { 1: 9000,  2: 3500, 3: 650 },
  "Pediatrician":     { 1: 7000,  2: 2800, 3: 500 },
  "Ophthalmologist":  { 1: 3500,  2: 1400, 3: 280 },
  "ENT":              { 1: 3000,  2: 1200, 3: 220 },
  "Cardiologist":     { 1: 4200,  2: 1600, 3: 300 },
  "Neurologist":      { 1: 2800,  2: 1100, 3: 200 },
  "Urologist":        { 1: 2500,  2: 1000, 3: 180 },
  "Psychiatrist":     { 1: 3800,  2: 1500, 3: 300 },
  "Physiotherapist":  { 1: 5000,  2: 2000, 3: 380 },
  "Ayurveda":         { 1: 6000,  2: 2400, 3: 450 },
  "Homeopathy":       { 1: 4500,  2: 1800, 3: 350 },
  "General Physician":{ 1: 10000, 2: 4000, 3: 700 },
  "Cosmetic Surgeon": { 1: 3200,  2: 1300, 3: 240 },
  "Oncologist":       { 1: 2000,  2: 800,  3: 150 },
  "Other":            { 1: 3500,  2: 1400, 3: 280 },
};

// ─── Deterministic Hash for Consistent Per-clinic Variance ──────────────────
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function variance(seed: string, min: number, max: number): number {
  const hash = simpleHash(seed);
  return min + (hash % (max - min + 1));
}

// ─── Scoring Algorithms ─────────────────────────────────────────────────────

function calculateLocalVisibility(
  cityTier: number,
  competitiveness: number,
  hasPinCode: boolean,
  seed: string
): number {
  // Base score by tier — smaller city = less competition = easier visibility
  const tierBase = cityTier === 1 ? 25 : cityTier === 2 ? 40 : 55;

  // Competitiveness penalty — highly competitive fields = harder to be visible
  const competitivePenalty = Math.round(competitiveness * 20);

  // Pin code bonus — specific location data improves analysis accuracy
  const pinCodeBonus = hasPinCode ? 10 : 0;

  // Small deterministic variance per clinic
  const v = variance(seed + "local", -5, 8);

  return Math.min(95, Math.max(5, tierBase - competitivePenalty + pinCodeBonus + v));
}

function calculateWebsiteHealth(
  website: string | undefined,
  specialization: string,
  seed: string
): number {
  if (!website || website.length < 5) return 0;

  let score = 30; // Base score for having a website at all

  // HTTPS bonus
  if (website.startsWith("https://")) score += 12;

  // Custom domain (not free hosting) bonus
  const freeDomains = ["wix.com", "wordpress.com", "blogspot.com", "weebly.com", "squarespace.com", "sites.google.com"];
  const isFreeDomain = freeDomains.some((d) => website.includes(d));
  if (!isFreeDomain) score += 8;

  // Keyword in domain bonus (e.g., "dental" in domain for a dentist)
  const specKeywords: Record<string, string[]> = {
    "Dentist": ["dental", "dent", "smile", "teeth", "tooth"],
    "Dermatologist": ["derm", "skin", "glow", "beauty"],
    "Orthopedic": ["ortho", "bone", "joint", "spine"],
    "IVF": ["ivf", "fertility", "baby", "conceive"],
    "Gynecologist": ["gynae", "gyne", "women", "maternity"],
    "Pediatrician": ["child", "kids", "pediatric", "baby"],
    "Ophthalmologist": ["eye", "vision", "optic", "sight"],
    "ENT": ["ent", "ear", "nose", "throat"],
    "Cardiologist": ["heart", "cardio", "cardiac"],
    "Neurologist": ["neuro", "brain", "nerve"],
    "Urologist": ["uro", "kidney", "urology"],
    "Psychiatrist": ["psych", "mind", "mental", "therapy"],
    "Physiotherapist": ["physio", "rehab", "therapy"],
    "Ayurveda": ["ayur", "herbal", "natural"],
    "Homeopathy": ["homeo", "natural", "holistic"],
    "General Physician": ["clinic", "health", "medical", "care"],
    "Cosmetic Surgeon": ["cosmetic", "plastic", "beauty", "aesthetic"],
    "Oncologist": ["onco", "cancer", "tumor"],
  };
  const keywords = specKeywords[specialization] || ["clinic", "health"];
  const domainLower = website.toLowerCase();
  if (keywords.some((kw) => domainLower.includes(kw))) score += 10;

  // Deterministic variance
  const v = variance(seed + "web", -3, 12);
  score += v;

  return Math.min(90, Math.max(10, score));
}

function calculateSeoScore(
  localVisibility: number,
  websiteHealth: number,
  cityTier: number,
  competitiveness: number
): number {
  // Weighted average: local visibility matters more than website for local SEO
  const rawScore = localVisibility * 0.45 + websiteHealth * 0.35 + (100 - competitiveness * 100) * 0.2;

  // City tier adjustment — tier 1 cities penalize more (harder to rank)
  const tierPenalty = cityTier === 1 ? 8 : cityTier === 2 ? 3 : 0;

  return Math.min(95, Math.max(5, Math.round(rawScore - tierPenalty)));
}

function calculateCompetitorRank(
  cityTier: number,
  competitiveness: number,
  hasWebsite: boolean,
  seed: string
): number {
  // Base rank — more competitive = worse rank
  const baseRank = Math.round(competitiveness * 15) + (cityTier === 1 ? 8 : cityTier === 2 ? 4 : 1);

  // No website = always ranked worse
  const websitePenalty = hasWebsite ? 0 : 5;

  const v = variance(seed + "rank", -2, 3);

  return Math.min(30, Math.max(3, baseRank + websitePenalty + v));
}

function calculateEstimatedLeads(
  specialization: string,
  cityTier: number,
  seoScore: number,
  seed: string
): number {
  const volumes = SEARCH_VOLUME[specialization] || SEARCH_VOLUME["Other"];
  const totalSearches = volumes[cityTier as 1 | 2 | 3] || 1400;

  // The missed leads = total searches × (1 - their capture rate)
  // Lower SEO score = lower capture rate = more missed leads
  const captureRate = seoScore / 100;
  const missedLeads = Math.round(totalSearches * (1 - captureRate));

  const v = variance(seed + "leads", -20, 30);
  return Math.max(10, missedLeads + v);
}

function determineGMBStatus(
  cityTier: number,
  competitiveness: number,
  hasWebsite: boolean,
  seed: string
): string {
  const score = (1 - competitiveness) * 30 + (hasWebsite ? 20 : 0) + (3 - cityTier) * 15;
  const v = variance(seed + "gmb", 0, 20);
  const finalScore = score + v;

  if (finalScore > 55) return "Optimized";
  if (finalScore > 35) return "Partially Claimed";
  if (finalScore > 20) return "Unclaimed or Incomplete";
  return "Not Found";
}

function generateRoadmap(
  formData: { clinicName: string; specialization: string; city: string; pinCode?: string; website?: string },
  localVisibility: number,
  websiteHealth: number,
  gmbStatus: string,
  seoScore: number
): string[] {
  const roadmap: string[] = [];
  const { clinicName, specialization, city, pinCode, website } = formData;

  // GMB step first if not optimized
  if (gmbStatus !== "Optimized") {
    roadmap.push(
      gmbStatus === "Not Found"
        ? `Create & verify Google Business Profile for "${clinicName}" in ${pinCode || city}`
        : `Optimize your Google Business Profile — add photos, services, and respond to reviews`
    );
  }

  // Website step
  if (!website || websiteHealth < 30) {
    roadmap.push(
      `Launch a fast, mobile-first website optimized for "${specialization} in ${city}" keywords`
    );
  } else if (websiteHealth < 60) {
    roadmap.push(
      `Fix technical SEO issues on ${website} — improve page speed, add schema markup, and optimize meta tags`
    );
  } else {
    roadmap.push(
      `Enhance content strategy on ${website} — add patient education pages and blog posts for organic traffic`
    );
  }

  // Local citations
  if (localVisibility < 50) {
    roadmap.push(
      `Build local directory citations on Practo, Justdial, Sulekha & 15+ directories for "${specialization} in ${city}"`
    );
  }

  // Review strategy
  roadmap.push(
    `Implement automated patient review collection system — target 50+ Google reviews in 90 days`
  );

  // Competitor gap
  if (seoScore < 60) {
    roadmap.push(
      `Run competitive gap analysis and launch targeted Google Ads for high-intent keywords like "best ${specialization.toLowerCase()} near ${pinCode || city}"`
    );
  } else {
    roadmap.push(
      `Expand into adjacent keywords — target "best ${specialization.toLowerCase()} in ${city}" and patient education queries`
    );
  }

  return roadmap.slice(0, 5);
}

// ─── API Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = text(body?.fullName, 120);
    const clinicName = text(body?.clinicName, 191);
    const specialization = text(body?.specialization, 64);
    const city = text(body?.city, 120);
    const phone = text(body?.phone, 40);
    const website = text(body?.website, 512);
    const pinCode = text(body?.pinCode, 12);

    if (!fullName || !clinicName || !specialization || !city) {
      return NextResponse.json({ error: "Name, clinic, specialization and city are required" }, { status: 400 });
    }

    // Create a deterministic seed for this clinic
    const seed = `${clinicName}-${city}-${specialization}-${pinCode || ""}`.toLowerCase();

    const cityTier = getCityTier(city);
    const competitiveness = getCompetitiveness(specialization);
    const hasWebsite = Boolean(website && website.length > 5);
    const hasPinCode = Boolean(pinCode && pinCode.length > 2);

    // ── Calculate Scores ──
    const localVisibilityScore = calculateLocalVisibility(cityTier, competitiveness, hasPinCode, seed);
    const websiteHealthScore = calculateWebsiteHealth(website, specialization, seed);
    const seoScore = calculateSeoScore(localVisibilityScore, websiteHealthScore, cityTier, competitiveness);
    const competitorRank = calculateCompetitorRank(cityTier, competitiveness, hasWebsite, seed);
    const googleBusinessStatus = determineGMBStatus(cityTier, competitiveness, hasWebsite, seed);
    const estimatedLeads = calculateEstimatedLeads(specialization, cityTier, seoScore, seed);

    const roadmap = generateRoadmap(
      { clinicName, specialization, city, pinCode, website },
      localVisibilityScore,
      websiteHealthScore,
      googleBusinessStatus,
      seoScore
    );

    // ── Persist to DB ──
    const audit = await prisma.clinicAudit.create({
      data: {
        fullName,
        clinicName,
        specialization,
        city,
        phone,
        website: website || null,
        pinCode: pinCode || "",
        seoScore,
        competitorRank,
        estimatedLeads,
        localVisibilityScore,
        websiteHealthScore,
        googleBusinessStatus,
        status: "pending",
      },
    });

    const reportData = {
      seoScore,
      competitorRank,
      estimatedLeads,
      localVisibilityScore,
      websiteHealthScore,
      googleBusinessStatus,
      roadmap,
    };

    // ── WhatsApp Automation (fire-and-forget) ──
    if (phone) {
      sendAuditReportWhatsApp(phone, reportData, {
        fullName,
        clinicName,
        specialization,
        city,
        website,
        pinCode,
      }).catch((err) => console.error("WhatsApp audit message failed:", err));
    }

    // ── Forward to the audit tool via webhook (fire-and-forget) ──
    sendAuditWebhook({
      auditId: audit.id,
      lead: { fullName, clinicName, specialization, city, phone, website, pinCode },
      scores: {
        seoScore,
        competitorRank,
        estimatedLeads,
        localVisibilityScore,
        websiteHealthScore,
        googleBusinessStatus,
      },
      roadmap,
      submittedAt: audit.createdAt.toISOString(),
    }).catch((err) => console.error("Audit webhook dispatch failed:", err));

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      report: reportData,
    });
  } catch (error: any) {
    console.error("Audit submission error:", error);
    return NextResponse.json({ error: "Failed to process audit request" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
