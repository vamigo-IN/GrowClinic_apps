import crypto from 'crypto';

// Activation-key helpers.
// Format shown once to the clinic:  <slug>_live_<random>
// We store only the SHA-256 hash; the plaintext is never persisted.

export function generateActivationKey(slug: string): { plaintext: string; keyHash: string; label: string } {
  const random = crypto.randomBytes(18).toString('base64url'); // ~24 chars, URL-safe
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'clinic';
  const plaintext = `${safeSlug}_live_${random}`;
  return {
    plaintext,
    keyHash: hashKey(plaintext),
    // Masked label for support/UI (never reveals the secret tail).
    label: `${safeSlug}_live_${random.slice(0, 4)}…`,
  };
}

export function hashKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

// Normalise an Origin/Referer host for comparison (strip protocol, www, port).
export function normaliseHost(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Does `origin` match the key's allow-list? Empty allow-list = allow any (dev).
export function originAllowed(allowedOriginsCsv: string, origin: string | null): boolean {
  const list = allowedOriginsCsv
    .split(',')
    .map((s) => normaliseHost(s.trim()))
    .filter(Boolean) as string[];
  if (list.length === 0) return true;
  const host = normaliseHost(origin);
  if (!host) return false;
  return list.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
