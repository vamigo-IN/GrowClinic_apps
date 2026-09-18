// Session auth + multi-tenant scoping + RBAC.
// A session cookie (`gmb_session`) maps to a row in `sessions`. requireAuth
// loads the user + active org + membership role onto req. Tenant scoping is
// enforced by always filtering queries on req.orgId.
import { one } from "../config/db.js";

const COOKIE = "gmb_session";

export function sessionCookieName() {
  return COOKIE;
}

// Load session → user (+ active org + role). Does NOT reject; sets req.user or null.
export async function loadSession(req, _res, next) {
  req.user = null;
  req.orgId = null;
  req.role = null;
  try {
    const sid = req.cookies?.[COOKIE] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!sid) return next();
    const sess = await one(
      `SELECT s.id, s."userId", s."orgId", s."expiresAt", s."revokedAt",
              u.name, u.phone, u.email, u."isSuperAdmin"
         FROM sessions s JOIN users u ON u.id = s."userId"
        WHERE s.id = :sid`,
      { sid }
    );
    if (!sess || sess.revokedAt || new Date(sess.expiresAt) < new Date()) return next();
    req.user = { id: sess.userId, name: sess.name, phone: sess.phone, email: sess.email, isSuperAdmin: !!sess.isSuperAdmin };
    req.sessionId = sess.id;
    if (sess.orgId) {
      const m = await one(
        `SELECT role, status FROM memberships WHERE "userId" = :uid AND "orgId" = :oid`,
        { uid: sess.userId, oid: sess.orgId }
      );
      if (m && m.status === "active") {
        req.orgId = sess.orgId;
        req.role = m.role;
      }
    }
  } catch (e) {
    console.warn("[auth] loadSession failed:", e.message);
  }
  next();
}

// Reject if not logged in.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// Reject if no active org context (most product routes need one).
export function requireOrg(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!req.orgId) return res.status(403).json({ error: "No active organization selected" });
  next();
}

// RBAC: allow only the given roles within the active org (super admin never
// gets clinic-write powers — that's a platform rule, enforced elsewhere).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!req.orgId || !req.role) return res.status(403).json({ error: "No active organization" });
    if (!roles.includes(req.role)) return res.status(403).json({ error: "Insufficient role" });
    next();
  };
}

// Platform staff only.
export function requireSuperAdmin(req, res, next) {
  if (!req.user?.isSuperAdmin) return res.status(403).json({ error: "Super admin only" });
  next();
}
