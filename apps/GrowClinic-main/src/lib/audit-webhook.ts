/**
 * Forwards a completed clinic-audit submission to the external audit tool
 * (audit.growclinic.io) via a webhook. Fire-and-forget: failures are logged
 * but never block the visitor's response.
 *
 * Configure the destination with the AUDIT_WEBHOOK_URL env var. A shared secret
 * can be set with AUDIT_WEBHOOK_SECRET (sent as the X-GrowClinic-Signature header).
 */

const DEFAULT_WEBHOOK_URL = "https://audit.growclinic.io/api/intake";

export interface AuditWebhookPayload {
    auditId: string;
    lead: {
        fullName: string;
        clinicName: string;
        specialization: string;
        city: string;
        phone: string;
        website?: string | null;
        pinCode?: string | null;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores?: any;
    // Silent attribution carried through to the audit tool
    attribution?: {
        clickId?: string | null;
        utmSource?: string | null;
        utmCampaign?: string | null;
        referrer?: string | null;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roadmap?: any;
    submittedAt: string;
}

export interface AuditWebhookResult {
    ok: boolean;
    status: number; // 0 when the request never completed (network/timeout)
    error?: string;
    // Secure handoff returned by the audit tool: a one-time token so the visitor
    // can be redirected without any PII in the URL.
    handoffToken?: string;
    handoffUrl?: string;
}

export async function sendAuditWebhook(payload: AuditWebhookPayload): Promise<AuditWebhookResult> {
    const url = process.env.AUDIT_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
    const secret = process.env.AUDIT_WEBHOOK_SECRET;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "GrowClinic-Audit-Webhook/1.0",
                ...(secret ? { "X-GrowClinic-Signature": secret } : {}),
            },
            body: JSON.stringify({ event: "audit.created", ...payload }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const text = (await res.text().catch(() => "")).slice(0, 300);
            console.error(`Audit webhook returned ${res.status} from ${url}:`, text);
            return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
        }

        // Capture the secure one-time handoff token the audit tool returns.
        const data = (await res.json().catch(() => ({}))) as {
            handoffToken?: string;
            handoffUrl?: string;
        };
        return {
            ok: true,
            status: res.status,
            handoffToken: data.handoffToken,
            handoffUrl: data.handoffUrl,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Audit webhook failed:", err);
        return { ok: false, status: 0, error: message };
    }
}
