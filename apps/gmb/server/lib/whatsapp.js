// WhatsApp sender — reuses the same Meta Graph API setup as the audit tool.
// Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN in hPanel env.
// Degrades gracefully: if unconfigured, logs and returns {skipped:true} so dev
// can still test the OTP flow (code is also logged in non-production).

const API_URL = () => (process.env.WHATSAPP_API_URL || "").trim();
const API_TOKEN = () => (process.env.WHATSAPP_API_TOKEN || "").trim();

export function isWhatsAppConfigured() {
  return !!(API_URL() && API_TOKEN());
}

export async function sendWhatsAppText(toPhone, message) {
  const clean = String(toPhone).replace(/\D/g, "");
  if (!isWhatsAppConfigured()) {
    console.warn(`[whatsapp] not configured — would send to ${clean}: ${message}`);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(API_URL(), {
      method: "POST",
      headers: { Authorization: `Bearer ${API_TOKEN()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: clean,
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp] API error:", res.status, await res.text().catch(() => ""));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[whatsapp] send failed:", e.message);
    return { ok: false };
  }
}

export async function sendOtp(phone, code) {
  const msg = `Your GrowClinic Gmb verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`;
  // Dev convenience: surface the code in logs when WhatsApp isn't wired yet.
  if (process.env.NODE_ENV !== "production") console.log(`[otp] ${phone} → ${code}`);
  return sendWhatsAppText(phone, msg);
}
