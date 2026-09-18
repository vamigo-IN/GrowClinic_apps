// Gmb — production Node entry for Hostinger Node.js hosting.
// Serves the built Vite SPA (dist/) and hosts the /api namespace.
// Startup file for the Hostinger app; build step: `npm run build` (produces dist/).
//
// In the GrowClinic platform stack this runs in the `gmb` container behind the
// central reverse proxy, with DATABASE_URL pointing at the shared PostgreSQL
// (schema `gmb`). The schema is applied by the platform migrate job, not here.

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

import { assertDb } from "./server/config/db.js";
import { loadSession } from "./server/middleware/auth.js";
import authRoutes from "./server/routes/auth.js";
import orgRoutes from "./server/routes/orgs.js";
import locationRoutes from "./server/routes/locations.js";
import auditRoutes from "./server/routes/audit.js";
import googleRoutes from "./server/routes/google.js";
import handoffRoutes from "./server/routes/handoff.js";
import editsRoutes from "./server/routes/edits.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1); // Hostinger runs behind a proxy — needed for req.ip / secure cookies
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(loadSession); // sets req.user / req.orgId / req.role (null if anonymous)

// ── API ─────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "gmb", ts: Date.now() }));
app.use("/api/audit", auditRoutes); // public instant-audit front door (no login)
app.use("/api/auth", authRoutes);
app.use("/api/orgs", orgRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/handoff", handoffRoutes);
app.use("/api/edits", editsRoutes);
// Future (M2+): /api/reviews, /api/drafts, /api/billing, /api/admin

// ── Static SPA + client-side routing fallback ────────────────────────────────
const distDir = path.join(__dirname, "dist");
if (!existsSync(distDir)) {
  console.warn("[gmb] dist/ not found — run `npm run build` before starting in production.");
}
// Content-hashed assets can be cached forever; index.html must always
// revalidate so a redeploy's new bundle is picked up immediately.
app.use(express.static(distDir, {
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache");
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  // A request for a real file (asset or anything with an extension) that
  // express.static didn't serve is genuinely missing — return a clean 404.
  // Never fall through to index.html for these: a stale cached bundle asking
  // for an old /assets/*.js hash would otherwise receive HTML, which the
  // browser tries to parse as JS ("Unexpected token '<'") and the app blanks.
  if (req.path.startsWith("/assets/") || path.extname(req.path)) {
    return res.status(404).send("Not found");
  }
  // Real client-side route (e.g. /app) → serve the SPA shell, never cached.
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(distDir, "index.html"));
});

// Boot: verify DB (if configured) then listen. A DB problem is logged, not
// fatal — the SPA keeps serving and API routes error until it is fixed; the
// check keeps retrying in the background so the log shows when it recovers.
async function start() {
  if (process.env.DATABASE_URL) {
    try { await assertDb(); }
    catch (e) {
      console.error("[gmb] DB check failed — API routes will error until DATABASE_URL / migrations are fixed:", e.message);
      retryDbCheck();
    }
  } else {
    console.log("[gmb] DATABASE_URL not set — running SPA-only (prototype mode).");
  }
  app.listen(PORT, () => console.log(`[gmb] listening on :${PORT}`));
}

function retryDbCheck(attempt = 1) {
  const wait = Math.min(30_000, 2_000 * attempt);
  setTimeout(() => {
    assertDb().catch(() => retryDbCheck(attempt + 1));
  }, wait).unref?.();
}
start();
