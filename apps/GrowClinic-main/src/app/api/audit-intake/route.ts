import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAuditWebhook } from "@/lib/audit-webhook";
import { text } from "@/lib/input";

/**
 * Secure intake for the on-site audit chatbox.
 *  - Saves the lead (no fabricated scores).
 *  - Securely forwards the data to the audit tool (audit.growclinic.io) via the
 *    server-side webhook, so the real report is generated there.
 *  - Returns only success; NO analytics/score data is sent back to the page.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const fullName = text(body?.fullName, 120);
        const clinicName = text(body?.clinicName, 191);
        const specialization = text(body?.specialization, 64);
        const city = text(body?.city, 120);
        const phone = text(body?.phone, 40);
        const website = text(body?.website, 512);
        const channels: string[] = Array.isArray(body?.channels)
            ? body.channels.slice(0, 10).map((c: unknown) => text(c, 32)).filter(Boolean)
            : [];

        // Silent attribution from the audit CTA
        const clickId = text(body?.clickId, 128) || null;
        const utmSource = text(body?.utmSource, 128) || null;
        const utmCampaign = text(body?.utmCampaign, 128) || null;
        const referrer = text(body?.referrer, 512) || null;

        // Minimal validation
        if (!clinicName || !city || !phone || !fullName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Persist the lead for the admin (no scores computed here).
        let auditId = "";
        try {
            const audit = await prisma.clinicAudit.create({
                data: {
                    fullName,
                    clinicName,
                    specialization: specialization || "Other",
                    city,
                    phone,
                    website: website || null,
                    pinCode: "",
                    status: "pending",
                    clickId,
                    utmSource,
                    utmCampaign,
                    referrer,
                    webhookStatus: "pending",
                },
            });
            auditId = audit.id;
        } catch (e) {
            console.error("audit-intake: lead save failed:", e);
        }

        // Securely forward to the audit tool. The webhook secret stays server-side.
        const result = await sendAuditWebhook({
            auditId: auditId || `intake_${Date.now()}`,
            lead: { fullName, clinicName, specialization, city, phone, website: website || null, pinCode: "" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scores: { channels } as any,
            attribution: { clickId, utmSource, utmCampaign, referrer },
            submittedAt: new Date().toISOString(),
        });

        // Record the webhook delivery status against the lead for the admin panel.
        if (auditId) {
            try {
                await prisma.clinicAudit.update({
                    where: { id: auditId },
                    data: {
                        webhookStatus: result.ok ? "success" : "failed",
                        webhookCode: result.status || null,
                        webhookError: result.ok ? null : (result.error || "Unknown error").slice(0, 500),
                        webhookAt: new Date(),
                    },
                });
            } catch (e) {
                console.error("audit-intake: webhook status update failed:", e);
            }
        }

        return NextResponse.json({
            success: true,
            handoffToken: result.handoffToken || null,
            handoffUrl: result.handoffUrl || null,
        });
    } catch (error) {
        console.error("audit-intake error:", error);
        return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }
}
