import { Router } from "express";
import { q, one, exec } from "../config/db.js";
import { wrap } from "../lib/util.js";
import { requireOrg, requireRole } from "../middleware/auth.js";
import { updateGoogleLocation } from "../lib/googleApi.js";
import { decryptToken } from "../lib/tokenCrypto.js";

const router = Router();

// Values published to the live Google profile must come from the user — never
// placeholders — and must be well-formed.
function cleanPhone(v) {
  const s = String(v || "").trim();
  return /^\+?[0-9][0-9 ()-]{6,19}$/.test(s) ? s : null;
}
function cleanWebsite(v) {
  try {
    const u = new URL(String(v || "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// GET /api/edits/:locationId
router.get("/:locationId", requireOrg, wrap(async (req, res) => {
  // First ensure they own the location
  const loc = await one(`SELECT id FROM locations WHERE id = :locId AND "orgId" = :oid`, { locId: req.params.locationId, oid: req.orgId });
  if (!loc) return res.status(404).json({ error: "Location not found" });

  const issues = await q(`SELECT * FROM location_issues WHERE "locationId" = :locId AND status = 'open' ORDER BY "createdAt" DESC`, { locId: loc.id });
  res.json({ issues });
}));

// POST /api/edits/:id/approve — publishes to Google, so only roles that may edit locations.
router.post("/:id/approve", requireOrg, requireRole("clinic_admin", "location_manager"), wrap(async (req, res) => {
  const issue = await one(`
    SELECT i.*, l."googleLocationId", l."orgId"
    FROM location_issues i
    JOIN locations l ON l.id = i."locationId"
    WHERE i.id = :id AND l."orgId" = :oid AND i.status = 'open'
  `, { id: req.params.id, oid: req.orgId });

  if (!issue) return res.status(404).json({ error: "Issue not found or already closed" });

  // Map `issue.field` to a Google API update (extend for hours, etc.).
  const updateMask = [];
  const updates = {};

  if (issue.field === "phone") {
    const phone = cleanPhone(req.body?.value);
    if (!phone) return res.status(400).json({ error: "A valid phone number is required" });
    updates.phoneNumbers = { primaryPhone: phone };
    updateMask.push("phoneNumbers");
  } else if (issue.field === "website") {
    const website = cleanWebsite(req.body?.value);
    if (!website) return res.status(400).json({ error: "A valid http(s) website URL is required" });
    updates.websiteUri = website;
    updateMask.push("websiteUri");
  }

  if (updateMask.length > 0) {
    const conn = await one(`SELECT "accessTokenEnc" FROM google_connections WHERE "orgId" = :oid AND status = 'active' LIMIT 1`, { oid: req.orgId });
    if (!conn) return res.status(403).json({ error: "Google account not connected" });
    const accessToken = decryptToken(conn.accessTokenEnc);
    try {
      await updateGoogleLocation(accessToken, issue.googleLocationId, updates, updateMask.join(","));
    } catch (e) {
      console.error("[edits] Google update failed:", e.message);
      return res.status(502).json({ error: "Failed to update Google" });
    }
  }

  await exec(`UPDATE location_issues SET status = 'approved', "approvedByUserId" = :uid, "approvedAt" = NOW() WHERE id = :id`, { uid: req.user.id, id: issue.id });
  res.json({ ok: true });
}));

export default router;
