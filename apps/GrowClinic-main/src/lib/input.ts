/**
 * Normalise an untrusted form value: strings and numbers only, trimmed and
 * capped, so public endpoints never store objects or megabytes of text.
 */
export function text(value: unknown, max: number): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().slice(0, max);
}

export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}
