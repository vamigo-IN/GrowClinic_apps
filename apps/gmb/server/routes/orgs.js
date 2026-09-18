// Organizations + members. Creating an org makes the creator its clinic_admin
// and sets it as their active org.
import { Router } from "express";
import { q, one, exec } from "../config/db.js";
import { uuid, audit, wrap } from "../lib/util.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function normalizePhone(p) {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length >= 8 ? `+${digits}` : "";
}

// POST /api/orgs { name }  — onboarding: create org + clinic_admin membership
router.post("/", requireAuth, wrap(async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 191);
  if (!name) return res.status(400).json({ error: "Organization name required" });

  const orgId = uuid();
  await exec(
    `INSERT INTO organizations (id, name, "ownerUserId", status) VALUES (:id, :name, :owner, 'active')`,
    { id: orgId, name, owner: req.user.id }
  );
  await exec(
    `INSERT INTO memberships (id, "userId", "orgId", role, status) VALUES (:id, :uid, :oid, 'clinic_admin', 'active')`,
    { id: uuid(), uid: req.user.id, oid: orgId }
  );
  // Make it the active org on the current session.
  await exec(`UPDATE sessions SET "orgId" = :oid WHERE id = :sid`, { oid: orgId, sid: req.sessionId });
  await audit({ orgId, actorUserId: req.user.id, action: "org_create", targetType: "org", targetId: orgId, ip: req.ip, meta: { name } });

  res.json({ org: { id: orgId, name }, activeOrgId: orgId, role: "clinic_admin" });
}));

// GET /api/orgs/:id  — org + its locations (must be a member)
router.get("/:id", requireAuth, wrap(async (req, res) => {
  const m = await one(
    `SELECT role FROM memberships WHERE "userId" = :uid AND "orgId" = :oid AND status = 'active'`,
    { uid: req.user.id, oid: req.params.id }
  );
  if (!m) return res.status(403).json({ error: "Not a member" });
  const org = await one(`SELECT id, name, "planId", status, "createdAt" FROM organizations WHERE id = :id`, { id: req.params.id });
  const locations = await q(`SELECT id, name, city, status, "completionScore" FROM locations WHERE "orgId" = :oid ORDER BY "createdAt" ASC`, { oid: req.params.id });
  res.json({ org, locations, role: m.role });
}));

// GET /api/orgs/:id/members
router.get("/:id/members", requireAuth, requireRole("clinic_admin"), wrap(async (req, res) => {
  if (req.orgId !== req.params.id) return res.status(403).json({ error: "Wrong org context" });
  const members = await q(
    `SELECT m.id, m.role, m.status, u.name, u.phone
       FROM memberships m JOIN users u ON u.id = m."userId"
      WHERE m."orgId" = :oid ORDER BY m."createdAt" ASC`,
    { oid: req.params.id }
  );
  res.json({ members });
}));

// POST /api/orgs/:id/members { phone, role }  — invite/add a member (clinic_admin only)
router.post("/:id/members", requireAuth, requireRole("clinic_admin"), wrap(async (req, res) => {
  if (req.orgId !== req.params.id) return res.status(403).json({ error: "Wrong org context" });
  const phone = normalizePhone(req.body?.phone);
  const role = String(req.body?.role || "");
  const allowed = ["clinic_admin", "location_manager", "content_reviewer", "analyst"];
  if (!phone || !allowed.includes(role)) return res.status(400).json({ error: "Valid phone and role required" });

  // Find or create the invited user by phone.
  let user = await one(`SELECT id FROM users WHERE phone = :phone`, { phone });
  if (!user) {
    const uid = uuid();
    await exec(`INSERT INTO users (id, phone) VALUES (:id, :phone)`, { id: uid, phone });
    user = { id: uid };
  }
  // Upsert membership.
  const existing = await one(`SELECT id FROM memberships WHERE "userId" = :uid AND "orgId" = :oid`, { uid: user.id, oid: req.params.id });
  if (existing) {
    await exec(`UPDATE memberships SET role = :role, status = 'active' WHERE id = :id`, { role, id: existing.id });
  } else {
    await exec(`INSERT INTO memberships (id, "userId", "orgId", role, status) VALUES (:id, :uid, :oid, :role, 'active')`,
      { id: uuid(), uid: user.id, oid: req.params.id, role });
  }
  await audit({ orgId: req.params.id, actorUserId: req.user.id, action: "member_add", targetType: "user", targetId: user.id, ip: req.ip, meta: { phone, role } });
  res.json({ ok: true });
}));

export default router;
