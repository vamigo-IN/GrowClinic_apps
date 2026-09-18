// Small shared helpers: ids, hashing, audit-event writer.
import crypto from "crypto";
import { exec } from "../config/db.js";

export const uuid = () => crypto.randomUUID();

// Opaque 64-char session/token string.
export const token = () => crypto.randomBytes(32).toString("hex");

// Hash OTP codes / secrets before storing (salted SHA-256; codes are short-lived).
export function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

// Constant-time compare for hashed values.
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Append-only audit log. Never throws (audit must not break the request).
export async function audit({ orgId = null, actorUserId = null, action, targetType = null, targetId = null, meta = null, ip = null }) {
  try {
    await exec(
      `INSERT INTO audit_events (id, "orgId", "actorUserId", action, "targetType", "targetId", meta, ip)
       VALUES (:id, :orgId, :actorUserId, :action, :targetType, :targetId, :meta, :ip)`,
      { id: uuid(), orgId, actorUserId, action, targetType, targetId, meta: meta ? JSON.stringify(meta) : null, ip }
    );
  } catch (e) {
    console.warn("[audit] write failed (non-critical):", e.message);
  }
}

// Wrap async route handlers so thrown errors become 500 JSON, not crashes.
export const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error("[api]", req.method, req.path, e.message);
    // Never send stack traces (file paths, SQL, library internals) to clients in production.
    if (!res.headersSent) {
      res.status(500).json(process.env.NODE_ENV === "production"
        ? { error: "Internal error" }
        : { error: "Internal error: " + e.message, stack: e.stack });
    }
  });
