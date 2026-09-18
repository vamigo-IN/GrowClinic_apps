// Auth routes — WhatsApp OTP login, session issue, me, logout, org switch.
import crypto from "crypto";
import { Router } from "express";
import { q, one, exec } from "../config/db.js";
import { uuid, token, hash, safeEqual, audit, wrap } from "../lib/util.js";
import { sendOtp } from "../lib/whatsapp.js";
import { sessionCookieName, requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// Per-IP limits on top of the per-phone caps below: every request sends a paid
// WhatsApp message, and verify attempts must not be spread across many codes.
router.use("/otp/request", rateLimit({ key: "otp-request", windowMs: 10 * 60_000, max: 10 }));
router.use("/otp/verify", rateLimit({ key: "otp-verify", windowMs: 10 * 60_000, max: 30 }));
const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ACTIVE_OTP_PER_HOUR = 5;

function normalizePhone(p) {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length >= 8 ? `+${digits}` : "";
}
function genCode() {
  return String(crypto.randomInt(100000, 1000000)); // 6-digit, CSPRNG
}

// POST /api/auth/otp/request { phone }
router.post("/otp/request", wrap(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: "Valid phone required" });

  // Rate limit: cap OTPs per phone per hour.
  const recent = await one(
    `SELECT COUNT(*) AS n FROM otp_codes WHERE phone = :phone AND "createdAt" > (NOW() - INTERVAL '1 hour')`,
    { phone }
  );
  if (recent && recent.n >= MAX_ACTIVE_OTP_PER_HOUR) {
    return res.status(429).json({ error: "Too many codes requested. Try again later." });
  }

  const code = genCode();
  await exec(
    `INSERT INTO otp_codes (id, phone, "codeHash", purpose, "expiresAt")
     VALUES (:id, :phone, :codeHash, 'login', :expiresAt)`,
    { id: uuid(), phone, codeHash: hash(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) }
  );
  const sent = await sendOtp(phone, code);

  // TEST MODE (no WhatsApp): when OTP_TEST_MODE=on, return the code in the
  // response so the flow is testable end-to-end. REMOVE before public launch.
  const testMode = process.env.OTP_TEST_MODE === "on";
  res.json({ ok: true, delivered: !!sent?.ok, ...(testMode ? { testCode: code } : {}) });
}));

// POST /api/auth/otp/verify { phone, code }  → issues session; creates user (+ org on first login)
router.post("/otp/verify", wrap(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || "").trim();
  if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

  const rec = await one(
    `SELECT * FROM otp_codes
      WHERE phone = :phone AND purpose = 'login' AND "consumedAt" IS NULL AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC LIMIT 1`,
    { phone }
  );
  if (!rec) return res.status(400).json({ error: "Code expired or not found. Request a new one." });
  if (rec.attempts >= 5) return res.status(429).json({ error: "Too many attempts. Request a new code." });

  if (!safeEqual(rec.codeHash, hash(code))) {
    await exec(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = :id`, { id: rec.id });
    return res.status(400).json({ error: "Incorrect code" });
  }
  await exec(`UPDATE otp_codes SET "consumedAt" = NOW() WHERE id = :id`, { id: rec.id });

  // Find or create the user.
  let user = await one(`SELECT * FROM users WHERE phone = :phone`, { phone });
  let firstLogin = false;
  if (!user) {
    const uid = uuid();
    await exec(`INSERT INTO users (id, phone) VALUES (:id, :phone)`, { id: uid, phone });
    user = { id: uid, phone };
    firstLogin = true;
  }
  await exec(`UPDATE users SET "lastLoginAt" = NOW() WHERE id = :id`, { id: user.id });

  // Pick an active org: the user's first membership (if any).
  const membership = await one(
    `SELECT "orgId" FROM memberships WHERE "userId" = :uid AND status = 'active' ORDER BY "createdAt" ASC LIMIT 1`,
    { uid: user.id }
  );
  const activeOrgId = membership?.orgId || null;

  // Issue session.
  const sid = token();
  await exec(
    `INSERT INTO sessions (id, "userId", "orgId", ip, "userAgent", "expiresAt")
     VALUES (:id, :userId, :orgId, :ip, :ua, :expiresAt)`,
    { id: sid, userId: user.id, orgId: activeOrgId, ip: req.ip, ua: (req.headers["user-agent"] || "").slice(0, 255), expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
  );
  res.cookie(sessionCookieName(), sid, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS, path: "/",
  });
  await audit({ orgId: activeOrgId, actorUserId: user.id, action: "login", ip: req.ip, meta: { firstLogin } });
  res.json({ ok: true, firstLogin, needsOrg: !activeOrgId });
}));

// GET /api/auth/me
router.get("/me", requireAuth, wrap(async (req, res) => {
  const memberships = await q(
    `SELECT m."orgId", m.role, o.name AS "orgName"
       FROM memberships m JOIN organizations o ON o.id = m."orgId"
      WHERE m."userId" = :uid AND m.status = 'active'`,
    { uid: req.user.id }
  );
  res.json({ user: req.user, activeOrgId: req.orgId || null, role: req.role || null, memberships });
}));

// POST /api/auth/profile { name }  — set the signed-in user's display name
// (includes the honorific prefix, e.g. "Dr. Jane Rao"). Collected at onboarding.
router.post("/profile", requireAuth, wrap(async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 191);
  if (!name) return res.status(400).json({ error: "Name required" });
  await exec(`UPDATE users SET name = :name WHERE id = :id`, { name, id: req.user.id });
  res.json({ ok: true, name });
}));

// POST /api/auth/switch-org { orgId }
router.post("/switch-org", requireAuth, wrap(async (req, res) => {
  const orgId = String(req.body?.orgId || "");
  const m = await one(
    `SELECT role FROM memberships WHERE "userId" = :uid AND "orgId" = :oid AND status = 'active'`,
    { uid: req.user.id, oid: orgId }
  );
  if (!m) return res.status(403).json({ error: "Not a member of that organization" });
  await exec(`UPDATE sessions SET "orgId" = :oid WHERE id = :sid`, { oid: orgId, sid: req.sessionId });
  res.json({ ok: true, activeOrgId: orgId, role: m.role });
}));

// POST /api/auth/logout
router.post("/logout", requireAuth, wrap(async (req, res) => {
  await exec(`UPDATE sessions SET "revokedAt" = NOW() WHERE id = :sid`, { sid: req.sessionId });
  res.clearCookie(sessionCookieName(), { path: "/" });
  res.json({ ok: true });
}));

export default router;
