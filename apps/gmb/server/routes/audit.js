// Public instant-audit front door (no login). Vizup-style: search a business,
// get a free GBP audit from public Google data, captured as a lead.
// Hardened: per-IP rate limit + place-details cache (protects the paid API).
import { Router } from "express";
import { exec } from "../config/db.js";
import { uuid, audit as auditLog, wrap } from "../lib/util.js";
import { autocomplete, placeDetails, isPlacesConfigured } from "../lib/places.js";
import { auditPlace } from "../lib/gbpAudit.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

const router = Router();

// Google place ids are short URL-safe tokens — reject anything weird early.
const validPlaceId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{10,300}$/.test(id);

// Rate limits: search is chattier (typing) than a full audit.
router.use("/search", rateLimit({ key: "audit-search", windowMs: 60_000, max: 60 }));
router.use("/place", rateLimit({ key: "audit-place", windowMs: 60_000, max: 20 }));
router.use("/lead", rateLimit({ key: "audit-lead", windowMs: 60_000, max: 10 }));

// GET /api/audit/search?q=...  — business-name autocomplete (public)
router.get("/search", wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (q.length < 3) return res.json({ results: [] });
  if (!isPlacesConfigured()) return res.status(503).json({ error: "Search is not configured yet." });
  const cacheKey = `ac:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ results: cached });
  const results = await autocomplete(q);
  cacheSet(cacheKey, results, 10 * 60_000); // 10 min
  res.json({ results });
}));

// GET /api/audit/place/:placeId  — run the free audit + capture the lead
router.get("/place/:placeId", wrap(async (req, res) => {
  const placeId = req.params.placeId;
  if (!validPlaceId(placeId)) return res.status(400).json({ error: "Invalid place id" });
  if (!isPlacesConfigured()) return res.status(503).json({ error: "Audit is not configured yet." });

  const cacheKey = `place:${placeId}`;
  let payload = cacheGet(cacheKey);
  if (!payload) {
    const place = placeDetailsGuard(await placeDetails(placeId));
    const report = auditPlace(place);
    payload = { place, report };
    cacheSet(cacheKey, payload, 15 * 60_000); // 15 min
  }

  // Capture as a lead (fire-and-forget; never block the report).
  exec(
    `INSERT INTO public_audits (id, "placeId", name, address, phone, website, city, category, rating, "reviewCount", score, issues)
     VALUES (:id, :placeId, :name, :address, :phone, :website, :city, :category, :rating, :reviewCount, :score, :issues)`,
    {
      id: uuid(), placeId: payload.place.placeId, name: payload.place.name, address: payload.place.address,
      phone: payload.place.phone, website: payload.place.website, city: payload.place.city, category: payload.place.primaryCategory,
      rating: payload.place.rating, reviewCount: payload.place.reviewCount, score: payload.report.score,
      issues: JSON.stringify(payload.report.issues.map((i) => i.key)),
    }
  ).catch((e) => console.warn("[audit] lead capture failed:", e.message));

  auditLog({ action: "public_audit", targetType: "place", targetId: payload.place.placeId, ip: req.ip, meta: { score: payload.report.score } });
  res.json(payload);
}));

// POST /api/audit/lead  { placeId, phone }  — attach a phone to a searched business
router.post("/lead", wrap(async (req, res) => {
  const placeId = String(req.body?.placeId || "");
  const phone = String(req.body?.phone || "").replace(/\D/g, "");
  if (!validPlaceId(placeId) || phone.length < 8) return res.status(400).json({ error: "placeId and phone required" });
  // Most recent audit of this place only (PostgreSQL has no UPDATE … ORDER BY … LIMIT).
  await exec(
    `UPDATE public_audits SET "leadPhone" = :phone
      WHERE id = (SELECT id FROM public_audits WHERE "placeId" = :placeId ORDER BY "createdAt" DESC LIMIT 1)`,
    { phone: `+${phone}`, placeId }
  );
  res.json({ ok: true });
}));

// Defensive: never let a malformed Places response crash scoring.
function placeDetailsGuard(p) {
  return {
    placeId: p?.placeId || "", name: p?.name || "", address: p?.address || "", city: p?.city || "",
    phone: p?.phone || "", website: p?.website || "", primaryCategory: p?.primaryCategory || "",
    categories: Array.isArray(p?.categories) ? p.categories : [],
    rating: p?.rating ?? null, reviewCount: p?.reviewCount ?? 0, photoCount: p?.photoCount ?? 0,
    hasHours: !!p?.hasHours, businessStatus: p?.businessStatus || "", description: p?.description || "",
    mapsUri: p?.mapsUri || "", location: p?.location || null,
  };
}

export default router;
