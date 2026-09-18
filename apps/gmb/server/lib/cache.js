// Tiny TTL cache (in-memory). Used to memoize Google Place details + audit
// reports by placeId so repeat audits don't re-hit (and re-bill) the API.
const store = new Map(); // key -> { value, exp }
const MAX = 1000;

export function cacheGet(key) {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { store.delete(key); return null; }
  return e.value;
}

export function cacheSet(key, value, ttlMs) {
  if (store.size >= MAX) {
    const oldest = store.keys().next().value; // simple FIFO eviction
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, exp: Date.now() + ttlMs });
}
