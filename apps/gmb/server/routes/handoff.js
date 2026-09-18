import express from "express";
import crypto from "crypto";
import { uuid, wrap } from "../lib/util.js";
import { putOnce, takeOnce } from "../lib/tokenStore.js";

const router = express.Router();
const HANDOFF_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Fail closed: the old "dummy-handoff-key" fallback was public in the source,
// so anyone could mint handoff tokens when the env var was missing.
const getHandoffKey = () => (process.env.INBOUND_HANDOFF_KEY || "").trim();

// POST /api/handoff - Called by the Audit tool backend to pass lead data securely
router.post("/", wrap(async (req, res) => {
  const key = getHandoffKey();
  if (key.length < 16) {
    console.error("[handoff] INBOUND_HANDOFF_KEY is not configured (16+ chars) — rejecting");
    return res.status(503).json({ error: "Handoff not configured" });
  }

  const signature = req.headers["x-handoff-key"];
  if (!signature) return res.status(401).json({ error: "Missing signature" });

  const payloadString = JSON.stringify(req.body);
  const expectedSig = crypto.createHmac("sha256", key).update(payloadString).digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  const sigBuffer = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return res.status(403).json({ error: "Invalid signature" });
  }

  const token = uuid();
  await putOnce("handoff", token, req.body, HANDOFF_TTL_MS);

  res.json({ token });
}));

// GET /api/handoff/:token - Called by the Gmb frontend to consume the token and retrieve data
router.get("/:token", wrap(async (req, res) => {
  const data = await takeOnce("handoff", req.params.token); // consumed on read (one-time)
  if (!data) return res.status(404).json({ error: "Token not found or expired" });
  res.json(data);
}));

export default router;
