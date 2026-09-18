// Tiny fetch client for the Gmb API (same-origin; sends the session cookie).
async function req(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Public instant audit (no login)
  auditSearch: (q) => req(`/api/audit/search?q=${encodeURIComponent(q)}`),
  auditPlace: (placeId) => req(`/api/audit/place/${encodeURIComponent(placeId)}`),
  auditLead: (placeId, phone) => req("/api/audit/lead", { method: "POST", body: { placeId, phone } }),

  otpRequest: (phone) => req("/api/auth/otp/request", { method: "POST", body: { phone } }),
  otpVerify: (phone, code) => req("/api/auth/otp/verify", { method: "POST", body: { phone, code } }),
  me: () => req("/api/auth/me"),
  createOrg: (name) => req("/api/orgs", { method: "POST", body: { name } }),
  createLocation: (loc) => req("/api/locations", { method: "POST", body: loc }),
  locations: () => req("/api/locations"),
  logout: () => req("/api/auth/logout", { method: "POST" }),
};
