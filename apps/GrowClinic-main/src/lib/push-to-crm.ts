/**
 * Fire-and-forget utility: push a website lead (contact form, booking, etc.)
 * into the audit tool's CRM so the sales team can work it from one place.
 *
 * Env vars:
 *   AUDIT_TOOL_URL   — base URL of the audit tool, e.g. https://audit.growclinic.io
 *                      Defaults to production URL if not set.
 *   INBOUND_LEADS_KEY — shared secret for server-to-server lead ingestion.
 *                      Must match the INBOUND_LEADS_KEY set in the audit tool.
 */

const AUDIT_BASE = (process.env.AUDIT_TOOL_URL || "https://audit.growclinic.io").replace(/\/$/, "");

export interface CrmLeadPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  clinicName?: string | null;
  source: string;          // e.g. "growclinic-contact", "growclinic-booking"
  message?: string | null; // contact form message or challenge description
  utmSource?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}

export async function pushToCrm(payload: CrmLeadPayload): Promise<void> {
  // Never block the user response — fully fire-and-forget
  void (async () => {
    try {
      const key = process.env.INBOUND_LEADS_KEY;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);

      await fetch(`${AUDIT_BASE}/api/lead-magnet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "GrowClinic-Website/1.0",
          // Key lets the audit tool distinguish real server-sent leads from
          // public popup submissions so they can be auto-tagged / prioritised.
          ...(key ? { "X-Inbound-Key": key } : {}),
        },
        body: JSON.stringify({
          name: payload.name,
          phone: payload.phone || "",
          email: payload.email || "",
          source: payload.source,
          sessionId: null,
          utmSource: payload.utmSource || "growclinic-website",
          utmCampaign: payload.utmCampaign || payload.source,
          referrer: payload.referrer || "https://www.growclinic.io",
          // Carry the clinic name and message as a remark in the notes field
          // so it shows up in the CRM lead card.
          notes: [
            payload.clinicName ? `Clinic: ${payload.clinicName}` : "",
            payload.message ? `Message: ${payload.message}` : "",
          ].filter(Boolean).join(" | "),
        }),
        signal: controller.signal,
      });

      clearTimeout(t);
    } catch (err) {
      // Log but never throw — the main request already succeeded.
      console.error("[pushToCrm] failed:", err instanceof Error ? err.message : err);
    }
  })();
}
