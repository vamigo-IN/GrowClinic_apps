import express from "express";
import crypto from "crypto";
import { one, exec } from "../config/db.js";
import { requireOrg, requireRole } from "../middleware/auth.js";
import { uuid, audit, wrap, safeEqual } from "../lib/util.js";
import { encryptToken, decryptToken } from "../lib/tokenCrypto.js";

const router = express.Router();

const getClientId = () => process.env.GOOGLE_CLIENT_ID || "dummy-client-id";
const getClientSecret = () => process.env.GOOGLE_CLIENT_SECRET || "dummy-secret";
const getRedirectUri = () => process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/api/google/callback";

// OAuth CSRF protection. The state parameter used to be plain base64 JSON
// {orgId, userId}, so anyone could forge a callback that attached THEIR Google
// account to ANOTHER organization. /connect now also sets a one-time random
// nonce in a short-lived httpOnly cookie and embeds it in state; /callback only
// proceeds when the nonce matches the cookie and the signed-in user matches the
// state (the gmb_session cookie is SameSite=Lax, so it is sent on Google's
// top-level redirect back).
const STATE_COOKIE = "gmb_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

// 1. Connect (Redirect to Google)
router.get("/connect", requireOrg, requireRole("clinic_admin"), wrap(async (req, res) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const state = JSON.stringify({ orgId: req.orgId, userId: req.user.id, nonce });
  const encodedState = Buffer.from(state).toString("base64");

  res.cookie(STATE_COOKIE, nonce, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_MS, path: "/api/google",
  });

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage",
    access_type: "offline",
    prompt: "consent select_account",
    state: encodedState
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}));

// 2. Callback (Exchange code for tokens)
router.get("/callback", wrap(async (req, res) => {
  const { code, state, error } = req.query;

  // Plain text: `error` comes straight from the query string (reflected XSS otherwise).
  if (error) return res.status(400).type("text/plain").send(`Google Auth Error: ${String(error).slice(0, 200)}`);
  if (!code || !state) return res.status(400).send("Missing code or state");

  let stateObj;
  try {
    stateObj = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
  } catch (e) {
    return res.status(400).send("Invalid state parameter");
  }

  const { orgId, userId, nonce } = stateObj || {};
  const cookieNonce = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/api/google" });
  if (!nonce || !cookieNonce || !safeEqual(nonce, cookieNonce)) {
    return res.status(400).send("Invalid or expired state — start the Google connection again.");
  }
  if (!req.user || req.user.id !== userId) {
    return res.status(403).send("Please sign in as the user who started the Google connection.");
  }
  const membership = await one(
    `SELECT role FROM memberships WHERE "userId" = :uid AND "orgId" = :oid AND status = 'active'`,
    { uid: userId, oid: orgId }
  );
  if (!membership || membership.role !== "clinic_admin") {
    return res.status(403).send("Only a clinic admin of this organization can connect Google.");
  }

  // Exchange code
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri()
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("[google] token exchange failed:", tokenData.error, tokenData.error_description);
    return res.status(400).type("text/plain").send("Google token exchange failed — start the Google connection again.");
  }

  const encAccess = encryptToken(tokenData.access_token);
  const encRefresh = encryptToken(tokenData.refresh_token); // might be undefined if not first time
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

  // Upsert google_connections
  const existing = await one(`SELECT id FROM google_connections WHERE "orgId" = :orgId LIMIT 1`, { orgId });
  if (existing) {
    await exec(
      `UPDATE google_connections
       SET "accessTokenEnc" = :encAccess,
           "refreshTokenEnc" = COALESCE(:encRefresh, "refreshTokenEnc"),
           "expiresAt" = :expiresAt,
           status = 'active',
           "updatedAt" = NOW()
       WHERE "orgId" = :orgId`,
      { encAccess, encRefresh: encRefresh || null, expiresAt, orgId }
    );
  } else {
    await exec(
      `INSERT INTO google_connections (id, "orgId", "connectedByUserId", "accessTokenEnc", "refreshTokenEnc", "expiresAt", status)
       VALUES (:id, :orgId, :userId, :encAccess, :encRefresh, :expiresAt, 'active')`,
      { id: uuid(), orgId, userId, encAccess, encRefresh, expiresAt }
    );
  }

  await audit({ orgId, actorUserId: userId, action: "google_connected" });

  res.redirect("/app?connected=true");
}));

// 3. Select Location (Bind a GBP location ID to an internal location)
router.post("/select", requireOrg, requireRole("clinic_admin"), wrap(async (req, res) => {
  const { googleLocationId, locationId } = req.body;
  if (!googleLocationId || !locationId) return res.status(400).json({ error: "Missing parameters" });

  // Verify the location belongs to the org
  const loc = await one(`SELECT id FROM locations WHERE id = :locationId AND "orgId" = :orgId`, { locationId, orgId: req.orgId });
  if (!loc) return res.status(404).json({ error: "Location not found" });

  await exec(
    `UPDATE locations SET "googleLocationId" = :googleLocationId, status = 'connected', "updatedAt" = NOW() WHERE id = :locationId`,
    { googleLocationId, locationId }
  );

  // Attempt to sync rich fields immediately
  try {
    const conn = await one(`SELECT "accessTokenEnc" FROM google_connections WHERE "orgId" = :orgId AND status = 'active'`, { orgId: req.orgId });
    if (conn) {
      const accessToken = decryptToken(conn.accessTokenEnc);
      const { getGoogleLocation } = await import("../lib/googleApi.js");
      const gData = await getGoogleLocation(accessToken, googleLocationId);

      const pCat = gData.categories?.primaryCategory?.name || null;
      const sCats = gData.categories?.additionalCategories ? JSON.stringify(gData.categories.additionalCategories.map(c => c.name)) : null;
      const lat = gData.latlng?.latitude || null;
      const lng = gData.latlng?.longitude || null;
      const rating = null; // Need separate Reviews API call
      const reviewCount = null;
      const hours = gData.regularHours ? JSON.stringify(gData.regularHours) : null;
      const gMapsUrl = gData.metadata?.mapsUri || null;

      await exec(`
        UPDATE locations SET
          "primaryCategory" = COALESCE(:pCat, "primaryCategory"),
          "secondaryCategories" = :sCats,
          latitude = :lat,
          longitude = :lng,
          "openingHours" = :hours,
          "googleMapsUrl" = :gMapsUrl,
          "lastSyncedAt" = NOW()
        WHERE id = :locationId
      `, { pCat, sCats, lat, lng, hours, gMapsUrl, locationId });
    }
  } catch (e) {
    console.error("Sync after selection failed:", e.message);
  }

  await audit({ orgId: req.orgId, actorUserId: req.user.id, action: "google_location_linked", targetType: "location", targetId: locationId });

  res.json({ ok: true });
}));

// 4. Disconnect
router.delete("/disconnect", requireOrg, requireRole("clinic_admin"), wrap(async (req, res) => {
  await exec(`DELETE FROM google_connections WHERE "orgId" = :orgId`, { orgId: req.orgId });
  await exec(`UPDATE locations SET "googleLocationId" = NULL, status = 'draft' WHERE "orgId" = :orgId`, { orgId: req.orgId });
  await audit({ orgId: req.orgId, actorUserId: req.user.id, action: "google_disconnected" });
  res.json({ ok: true });
}));

// 5. List Locations (Fetch from Google GBP API)
router.get("/locations", requireOrg, requireRole("clinic_admin"), wrap(async (req, res) => {
  // Ensure we have an active connection
  const conn = await one(`SELECT "accessTokenEnc" FROM google_connections WHERE "orgId" = :orgId AND status = 'active'`, { orgId: req.orgId });
  if (!conn) return res.status(403).json({ error: "Google account not connected" });

  const accessToken = decryptToken(conn.accessTokenEnc);
  if (!accessToken) {
    console.error("[google] stored token could not be decrypted (corrupted, or TOKEN_ENC_KEY changed)");
    return res.status(500).json({ error: "Failed to fetch locations from Google — reconnect your Google account" });
  }

  const { getGoogleAccounts, getLocationsForAccount } = await import("../lib/googleApi.js");

  try {
    const accounts = await getGoogleAccounts(accessToken);
    let allLocations = [];

    for (const account of accounts) {
      const locations = await getLocationsForAccount(accessToken, account.name);
      allLocations = allLocations.concat(locations.map(loc => ({
        name: loc.name,
        title: loc.title,
        address: loc.storefrontAddress?.addressLines?.join(", ") || "No address provided"
      })));
    }

    res.json(allLocations);
  } catch (e) {
    console.error("Failed to fetch Google locations:", e.message);
    res.status(500).json({ error: "Failed to fetch locations from Google" });
  }
}));

export default router;
