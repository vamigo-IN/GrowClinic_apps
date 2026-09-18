// Lightweight in-memory per-IP rate limiter (no external dep). Protects the
// public, unauthenticated audit endpoints — which call the paid Google Places
// API — from spam / cost-abuse. Fixed window.
const buckets = new Map(); // id -> { count, resetAt }

export function rateLimit({ windowMs = 60_000, max = 30, key = "" } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip || "unknown"}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(id, b);
    }
    b.count++;
    if (b.count > max) {
      res.setHeader("Retry-After", Math.ceil((b.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }
    next();
  };
}

// Periodic sweep so the map never grows unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, b] of buckets) if (now > b.resetAt) buckets.delete(id);
}, 5 * 60_000).unref?.();
