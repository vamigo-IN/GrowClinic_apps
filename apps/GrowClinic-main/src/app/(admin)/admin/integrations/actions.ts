"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/guards";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.growclinic.io";

export async function saveIntegrations(formData: FormData) {
    // Tracking ids are injected into every public page — admins only.
    await assertAdmin();

    const clean = (v: FormDataEntryValue | null) => {
        const s = (v?.toString() || "").trim();
        return s.length ? s : null;
    };

    const ga4Id = clean(formData.get("ga4Id"));
    const gtmId = clean(formData.get("gtmId"));
    const metaPixelId = clean(formData.get("metaPixelId"));

    await prisma.siteSettings.upsert({
        where: { id: "global" },
        update: { ga4Id, gtmId, metaPixelId },
        create: { id: "global", ga4Id, gtmId, metaPixelId },
    });

    // Reflect the change across the whole site (tracking is injected in the root layout).
    revalidatePath("/", "layout");
    revalidatePath("/admin/integrations");
}

export type ToolStatus = "live" | "configured" | "invalid" | "off";

export interface IntegrationStatus {
    ga4: ToolStatus;
    gtm: ToolStatus;
    pixel: ToolStatus;
    clarity: ToolStatus;
    gsc: ToolStatus;
    bing: ToolStatus;
    // Did the provider's own endpoint respond for this ID? (the live "ping")
    provider: { ga4: boolean; gtm: boolean; pixel: boolean; clarity: boolean };
    checkedAt: string;
    siteReachable: boolean;
}

/**
 * Real connection check: fetches the live homepage and detects whether each
 * configured tracking ID is actually present in the served HTML.
 *  - "live"       → configured AND detected on the live site
 *  - "configured" → an ID is saved but not yet detected (needs a deploy/cache clear)
 *  - "off"        → no ID configured
 */
export async function checkIntegrationStatus(): Promise<IntegrationStatus> {
    await assertAdmin();

    const settings = await prisma.siteSettings.findUnique({ where: { id: "global" } });

    let html = "";
    let siteReachable = false;
    try {
        const res = await fetch(`${SITE_URL}/?integration_check=${Date.now()}`, {
            cache: "no-store",
            headers: { "User-Agent": "GrowClinic-IntegrationCheck/1.0" },
        });
        siteReachable = res.ok;
        html = await res.text();
    } catch {
        siteReachable = false;
    }

    // Per-tool ID format (deterministic — instantly catches a typo'd/wrong code).
    const FORMAT = {
        ga4: /^G-[A-Z0-9]{6,12}$/i,
        gtm: /^GTM-[A-Z0-9]{4,10}$/i,
        pixel: /^\d{13,17}$/,
        clarity: /^[a-z0-9]{8,12}$/i,
    } as const;

    // Live ping: hit the provider's OWN endpoint for this ID and confirm it
    // serves a tag (HTTP 200). This is the "is it actually working" check —
    // not just "is the string printed on the page". Fails closed on errors.
    async function ping(url: string): Promise<boolean> {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        try {
            const r = await fetch(url, {
                cache: "no-store",
                signal: ctrl.signal,
                headers: { "User-Agent": "GrowClinic-IntegrationCheck/1.0" },
            });
            await r.text().catch(() => "");
            return r.ok;
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }
    }

    const ga4Id = (settings?.ga4Id || "").trim();
    const gtmId = (settings?.gtmId || "").trim();
    const pixelId = (settings?.metaPixelId || "").trim();
    const clarityId = "u3ju4tpj50"; // hardcoded in TrackingScripts

    // Ping every provider in parallel (only for well-formed IDs).
    const [pGa4, pGtm, pPixel, pClarity] = await Promise.all([
        ga4Id && FORMAT.ga4.test(ga4Id) ? ping(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`) : Promise.resolve(false),
        gtmId && FORMAT.gtm.test(gtmId) ? ping(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`) : Promise.resolve(false),
        pixelId && FORMAT.pixel.test(pixelId) ? ping(`https://connect.facebook.net/signals/config/${encodeURIComponent(pixelId)}?v=2.9.187`) : Promise.resolve(false),
        ping(`https://www.clarity.ms/tag/${clarityId}`),
    ]);

    // Combine signals: empty → off, bad format → invalid; otherwise needs BOTH
    // the tag present on the live site AND the provider ping to pass for "live".
    const combine = (kind: keyof typeof FORMAT, id: string, providerOk: boolean): ToolStatus => {
        if (!id) return "off";
        if (!FORMAT[kind].test(id)) return "invalid";
        const onSite = siteReachable && html.includes(id);
        return onSite && providerOk ? "live" : "configured";
    };

    // Verification tokens — their presence on the live site IS the proof.
    const BING_TOKEN = process.env.BING_SITE_VERIFICATION || "89122CBA86D2D09B939C820E1AF40859";
    const GSC_META = (process.env.GOOGLE_SITE_VERIFICATION || "").trim();
    const bing: ToolStatus = siteReachable && html.includes(BING_TOKEN) ? "live" : "off";

    // Google Search Console — meta tag (env) OR the google….html file in /public.
    let gsc: ToolStatus = siteReachable && GSC_META && html.includes(GSC_META) ? "live" : "off";
    if (gsc === "off") {
        try {
            const fr = await fetch(`${SITE_URL}/google336e0d5180b0f72d.html?v=${Date.now()}`, {
                cache: "no-store",
                headers: { "User-Agent": "GrowClinic-IntegrationCheck/1.0" },
            });
            if (fr.ok && (await fr.text()).includes("google-site-verification")) gsc = "live";
        } catch {
            /* file unreachable — leave as off */
        }
    }

    return {
        ga4: combine("ga4", ga4Id, pGa4),
        gtm: combine("gtm", gtmId, pGtm),
        pixel: combine("pixel", pixelId, pPixel),
        clarity: combine("clarity", clarityId, pClarity),
        gsc,
        bing,
        provider: { ga4: pGa4, gtm: pGtm, pixel: pPixel, clarity: pClarity },
        checkedAt: new Date().toISOString(),
        siteReachable,
    };
}
