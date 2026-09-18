import crypto from 'crypto';

// Password hashing for Engine users.
//
// New hashes: scrypt (memory-hard, per-password random salt) via Node's built-in
// crypto — no extra dependency. Stored as:
//   scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>
// Parameters are stored with the hash so they can be raised later without
// invalidating existing passwords.
//
// Legacy hashes: the MySQL-era seed stored unsalted SHA-256 hex digests. Those
// still verify (so no user is locked out by the migration) but are reported
// with `needsRehash: true`; the caller must then store hashPassword(plain).
// See DATABASE-MIGRATION.md → "Engine password hashing".

const SCRYPT_N = 32768; // 2^15
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAXMEM = 64 * 1024 * 1024;

const LEGACY_SHA256 = /^[a-f0-9]{64}$/i;

function scrypt(plain: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, KEY_LEN, { N, r, p, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scrypt(plain, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };

  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 6) return { ok: false, needsRehash: false };
    const [, n, r, p, saltB64, hashB64] = parts;
    const N = Number(n), R = Number(r), P = Number(p);
    if (!Number.isInteger(N) || !Number.isInteger(R) || !Number.isInteger(P)) return { ok: false, needsRehash: false };
    const expected = Buffer.from(hashB64, 'base64url');
    let actual: Buffer;
    try {
      actual = await scrypt(plain, Buffer.from(saltB64, 'base64url'), N, R, P);
    } catch {
      return { ok: false, needsRehash: false };
    }
    const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    const weaker = N < SCRYPT_N || R < SCRYPT_R || P < SCRYPT_P;
    return { ok, needsRehash: ok && weaker };
  }

  if (LEGACY_SHA256.test(stored)) {
    const expected = Buffer.from(stored.toLowerCase(), 'hex');
    const actual = crypto.createHash('sha256').update(plain).digest();
    const ok = crypto.timingSafeEqual(expected, actual);
    return { ok, needsRehash: ok };
  }

  return { ok: false, needsRehash: false };
}

export function isLegacyHash(stored: string | null | undefined): boolean {
  return !!stored && LEGACY_SHA256.test(stored);
}

// Emails are identities: compare/store them lower-cased.
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
