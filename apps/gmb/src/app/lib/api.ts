// API client for the Gmb backend (same-origin; sends the session cookie).
async function req(path: string, opts: { method?: string; body?: any } = {}): Promise<any> {
  const { method = "GET", body } = opts;
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    const details = (data && data.details) ? ` - ${data.details}` : "";
    throw new Error(msg + details);
  }
  return data;
}

export const api = {
  // Public instant audit (no login)
  auditSearch: (q: string) => req(`/api/audit/search?q=${encodeURIComponent(q)}`),
  auditPlace: (placeId: string) => req(`/api/audit/place/${encodeURIComponent(placeId)}`),
  handoffExchange: (token: string) => req(`/api/handoff/${encodeURIComponent(token)}`),

  // Auth (WhatsApp OTP)
  otpRequest: (phone: string) => req("/api/auth/otp/request", { method: "POST", body: { phone } }),
  otpVerify: (phone: string, code: string) => req("/api/auth/otp/verify", { method: "POST", body: { phone, code } }),
  me: () => req("/api/auth/me"),
  setProfile: (name: string) => req("/api/auth/profile", { method: "POST", body: { name } }),
  logout: () => req("/api/auth/logout", { method: "POST" }),

  // Orgs + locations
  createOrg: (name: string) => req("/api/orgs", { method: "POST", body: { name } }),
  createLocation: (loc: any) => req("/api/locations", { method: "POST", body: loc }),
  locations: () => req("/api/locations"),
  location: (id: string) => req(`/api/locations/${encodeURIComponent(id)}`),
  score: (id: string) => req(`/api/locations/${encodeURIComponent(id)}/score`),

  // Google
  googleLocations: () => req("/api/google/locations"),
  googleSelect: (googleLocationId: string, locationId: string) => req("/api/google/select", { method: "POST", body: { googleLocationId, locationId } }),
  googleDisconnect: () => req("/api/google/disconnect", { method: "DELETE" }),
};
