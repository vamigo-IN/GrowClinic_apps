// Locations (clinic GBP profiles). V1 M1: draft CRUD scoped to the active org.
// Google binding + sync arrive in M2.
import { Router } from "express";
import { q, one, exec } from "../config/db.js";
import { uuid, audit, wrap } from "../lib/util.js";
import { requireOrg, requireRole } from "../middleware/auth.js";
import { auditProfileCompleteness } from "../lib/gbpAudit.js";

const router = Router();

const S = (v, n = 191) => (v == null ? null : String(v).slice(0, n));

// GET /api/locations  — all locations for the active org
router.get("/", requireOrg, wrap(async (req, res) => {
  const rows = await q(
    `SELECT id, name, "primaryCategory", city, locality, address, phone, website, email,
            status, "completionScore", "lastSyncedAt", "createdAt", "googleLocationId"
       FROM locations WHERE "orgId" = :oid ORDER BY "createdAt" ASC`,
    { oid: req.orgId }
  );
  res.json({ locations: rows });
}));

// GET /api/locations/:id
router.get("/:id", requireOrg, wrap(async (req, res) => {
  const loc = await one(`SELECT * FROM locations WHERE id = :id AND "orgId" = :oid`, { id: req.params.id, oid: req.orgId });
  if (!loc) return res.status(404).json({ error: "Location not found" });
  res.json({ location: loc });
}));

import { getGoogleLocation } from "../lib/googleApi.js";
import { mapGoogleLocationToAuditFormat, scoreChecks, CHECKS } from "../lib/gbpAudit.js";
import { decryptToken } from "../lib/tokenCrypto.js";

// GET /api/locations/:id/score
router.get("/:id/score", requireOrg, wrap(async (req, res) => {
  const loc = await one(`SELECT * FROM locations WHERE id = :id AND "orgId" = :oid`, { id: req.params.id, oid: req.orgId });
  if (!loc) return res.status(404).json({ error: "Location not found" });

  let report;
  if (loc.status === "connected" && loc.googleLocationId) {
    // 1. Fetch connection tokens
    const conn = await one(`SELECT "accessTokenEnc" FROM google_connections WHERE "orgId" = :oid AND status = 'active' LIMIT 1`, { oid: req.orgId });
    if (!conn) {
      report = auditProfileCompleteness(loc);
      return res.json({ connected: false, source: "profile", report });
    }

    const accessToken = decryptToken(conn.accessTokenEnc);

    // 2. Fetch live data
    try {
      const liveData = await getGoogleLocation(accessToken, loc.googleLocationId);
      const auditFormat = mapGoogleLocationToAuditFormat(liveData);
      report = scoreChecks(CHECKS, auditFormat);

      // 3. Sync failed checks to location_issues table
      for (const check of report.failed) {
        const existing = await one(`SELECT id FROM location_issues WHERE "locationId" = :locId AND field = :field AND status = 'open'`, { locId: loc.id, field: check.key });
        if (!existing) {
          await exec(
            `INSERT INTO location_issues (id, "locationId", category, field, title, description, status)
             VALUES (:id, :locId, 'core_profile', :field, :title, :desc, 'open')`,
            { id: uuid(), locId: loc.id, field: check.key, title: check.label, desc: check.fix }
          );
        }
      }
    } catch (e) {
      console.error("Failed to fetch live Google data:", e);
      report = auditProfileCompleteness(loc); // fallback
    }
  } else {
    report = auditProfileCompleteness(loc);
  }

  res.json({
    connected: loc.status === "connected",
    source: loc.status === "connected" ? "google" : "profile",
    report,
  });
}));

// POST /api/locations  — create a draft location (clinic_admin / location_manager)
router.post("/", requireOrg, requireRole("clinic_admin", "location_manager"), wrap(async (req, res) => {
  const b = req.body || {};
  const name = S(b.name);
  if (!name) return res.status(400).json({ error: "Location name required" });
  const id = uuid();
  await exec(
    `INSERT INTO locations (id, "orgId", name, "primaryCategory", city, locality, address, phone, website, email, "placeId", status)
     VALUES (:id, :oid, :name, :cat, :city, :locality, :address, :phone, :website, :email, :placeId, 'draft')`,
    {
      id, oid: req.orgId, name,
      cat: S(b.primaryCategory), city: S(b.city, 120), locality: S(b.locality, 120),
      address: S(b.address, 512), phone: S(b.phone, 40), website: S(b.website, 512), email: S(b.email),
      placeId: S(b.placeId),
    }
  );
  await audit({ orgId: req.orgId, actorUserId: req.user.id, action: "location_create", targetType: "location", targetId: id, ip: req.ip, meta: { name } });
  res.json({ location: await one(`SELECT * FROM locations WHERE id = :id`, { id }) });
}));

// PATCH /api/locations/:id  — update draft fields (non-Google in M1)
router.patch("/:id", requireOrg, requireRole("clinic_admin", "location_manager"), wrap(async (req, res) => {
  const loc = await one(`SELECT id FROM locations WHERE id = :id AND "orgId" = :oid`, { id: req.params.id, oid: req.orgId });
  if (!loc) return res.status(404).json({ error: "Location not found" });
  const b = req.body || {};
  const fields = ["name", "primaryCategory", "city", "locality", "address", "phone", "website", "email"];
  const sets = [];
  const params = { id: req.params.id };
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`"${f}" = :${f}`); params[f] = S(b[f], f === "address" || f === "website" ? 512 : 191); }
  }
  if (!sets.length) return res.json({ ok: true });
  // updatedAt is maintained by the gmb.set_updated_at trigger (was ON UPDATE CURRENT_TIMESTAMP in MySQL).
  await exec(`UPDATE locations SET ${sets.join(", ")} WHERE id = :id`, params);
  await audit({ orgId: req.orgId, actorUserId: req.user.id, action: "location_update", targetType: "location", targetId: req.params.id, ip: req.ip });
  res.json({ location: await one(`SELECT * FROM locations WHERE id = :id`, { id: req.params.id }) });
}));

export default router;
