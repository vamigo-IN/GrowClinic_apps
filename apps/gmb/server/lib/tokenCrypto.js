// AES-256-GCM encryption for stored Google OAuth tokens (google_connections).
//
// Single source of truth for the key derivation. Previously routes/google.js,
// routes/locations.js and routes/edits.js each had their own copy and edits.js
// derived a DIFFERENT key (hex-decoding TOKEN_ENC_KEY even when JWT_SECRET was
// set, or a random key when TOKEN_ENC_KEY was unset), so approving an edit could
// never decrypt the token google.js had stored. The derivation below is exactly
// the one google.js used to ENCRYPT, so every token already in the database
// keeps decrypting.
import crypto from "crypto";

const ENC_ALGO = "aes-256-gcm";

let warned = false;
function getEncKey() {
  if (!process.env.TOKEN_ENC_KEY && !process.env.JWT_SECRET && !warned) {
    warned = true;
    console.warn("[gmb] TOKEN_ENC_KEY is not set — Google tokens are encrypted with a built-in fallback key. Set TOKEN_ENC_KEY (see .env.example).");
  }
  const key = process.env.TOKEN_ENC_KEY || process.env.JWT_SECRET || "fallback-secret";
  if (key.length === 64 && !process.env.JWT_SECRET) return Buffer.from(key, "hex");
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptToken(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, getEncKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${tag}`;
}

// Returns null for missing, malformed or undecryptable values.
export function decryptToken(encrypted) {
  if (!encrypted) return null;
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) return null;
    const [iv, ciphertext, tag] = parts;
    const decipher = crypto.createDecipheriv(ENC_ALGO, getEncKey(), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}
