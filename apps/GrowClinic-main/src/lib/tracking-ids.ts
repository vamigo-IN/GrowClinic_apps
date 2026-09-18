// Tracking ids are interpolated into inline <script> snippets and tag URLs, so
// only well-formed ids are ever rendered. A malformed or malicious value is
// dropped (the Integrations page still reports it as "invalid").
const GA4 = /^G-[A-Z0-9]{4,16}$/i;
const GTM = /^GTM-[A-Z0-9]{4,12}$/i;
const META_PIXEL = /^\d{6,20}$/;

function valid(value: string | null | undefined, format: RegExp): string | undefined {
  const v = value?.trim();
  return v && format.test(v) ? v : undefined;
}

export const safeGa4Id = (v: string | null | undefined) => valid(v, GA4);
export const safeGtmId = (v: string | null | undefined) => valid(v, GTM);
export const safeMetaPixelId = (v: string | null | undefined) => valid(v, META_PIXEL);
