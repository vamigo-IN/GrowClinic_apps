// Google Places API (v1) client — public GBP data for the instant audit.
// Needs GOOGLE_PLACES_API_KEY (Maps Platform → Places API enabled).
// This is PUBLIC data (no owner OAuth) — distinct from the Business Profile API.

const KEY = () => (process.env.GOOGLE_PLACES_API_KEY || "").trim();

export function isPlacesConfigured() {
  return !!KEY();
}

// Autocomplete: returns [{ placeId, primaryText, secondaryText }].
export async function autocomplete(input, { regionCode = "in" } = {}) {
  if (!isPlacesConfigured()) throw new Error("Places API not configured");
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY() },
    body: JSON.stringify({ input, includedRegionCodes: [regionCode] }),
  });
  if (!res.ok) throw new Error(`Places autocomplete failed (${res.status})`);
  const data = await res.json();
  return (data.suggestions || [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      placeId: p.placeId,
      primaryText: p.structuredFormat?.mainText?.text || p.text?.text || "",
      secondaryText: p.structuredFormat?.secondaryText?.text || "",
    }));
}

// Place Details: the fields we score the audit on.
const FIELD_MASK = [
  "id", "displayName", "formattedAddress", "addressComponents",
  "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri",
  "rating", "userRatingCount", "primaryTypeDisplayName", "types",
  "regularOpeningHours", "businessStatus", "photos", "location",
  "googleMapsUri", "editorialSummary",
].join(",");

export async function placeDetails(placeId) {
  if (!isPlacesConfigured()) throw new Error("Places API not configured");
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": KEY(), "X-Goog-FieldMask": FIELD_MASK },
  });
  if (!res.ok) throw new Error(`Place details failed (${res.status})`);
  const p = await res.json();

  const cityComp = (p.addressComponents || []).find((c) => (c.types || []).includes("locality"))
    || (p.addressComponents || []).find((c) => (c.types || []).includes("administrative_area_level_2"));

  // Normalise to a flat shape the audit + onboarding both use.
  return {
    placeId: p.id || placeId,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    city: cityComp?.longText || "",
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
    website: p.websiteUri || "",
    primaryCategory: p.primaryTypeDisplayName?.text || "",
    categories: p.types || [],
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? 0,
    photoCount: (p.photos || []).length,
    hasHours: !!(p.regularOpeningHours && p.regularOpeningHours.periods?.length),
    businessStatus: p.businessStatus || "",
    description: p.editorialSummary?.text || "",
    mapsUri: p.googleMapsUri || "",
    location: p.location || null,
  };
}
