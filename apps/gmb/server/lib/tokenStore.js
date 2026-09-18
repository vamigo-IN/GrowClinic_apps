// One-time token store — shared Redis with an in-memory fallback.
//
// Used for the audit → Gmb handoff tokens (POST /api/handoff → GET
// /api/handoff/:token). Tokens used to live only in process memory, so a
// restart/redeploy inside the 15-minute window lost them. With REDIS_URL set
// they survive restarts; without it (or while Redis is unreachable) the
// previous in-memory behaviour is used.
//
// Keys are namespaced `gmb:<namespace>:<token>` (the platform Redis ACL only
// lets this app touch `gmb:*`), expire server-side (PX) and are consumed
// atomically with GETDEL.
import { createClient } from "redis";

const KEY_PREFIX = "gmb:";
const memory = new Map(); // key -> { value, expires }

let client = null;
function redis() {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
      // Fail fast instead of queueing while disconnected — fall back to memory.
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => Math.min(retries * 500, 10_000),
      },
    });
    let warned = false;
    client.on("ready", () => { warned = false; console.log("[redis] connected"); });
    client.on("error", (e) => {
      if (!warned) console.warn("[redis] unavailable, using in-memory fallback:", e.message);
      warned = true;
    });
    client.connect().catch(() => { /* reported by the error handler */ });
  }
  return client.isReady ? client : null;
}

export async function putOnce(namespace, token, data, ttlMs) {
  const key = `${KEY_PREFIX}${namespace}:${token}`;
  const c = redis();
  if (c) {
    try {
      await c.sendCommand(["SET", key, JSON.stringify(data), "PX", String(ttlMs)]);
      return;
    } catch (e) {
      console.warn("[redis] SET failed, using memory:", e.message);
    }
  }
  memory.set(key, { value: data, expires: Date.now() + ttlMs });
}

// Returns the stored data and deletes it, or null when missing/expired.
export async function takeOnce(namespace, token) {
  const key = `${KEY_PREFIX}${namespace}:${token}`;
  const entry = memory.get(key);
  if (entry) {
    memory.delete(key);
    if (entry.expires >= Date.now()) return entry.value;
  }
  const c = redis();
  if (c) {
    try {
      const raw = await c.sendCommand(["GETDEL", key]);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("[redis] GETDEL failed:", e.message);
    }
  }
  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memory) if (v.expires < now) memory.delete(k);
}, 5 * 60 * 1000).unref?.();

// Connect eagerly so the first handoff doesn't miss Redis.
redis();
