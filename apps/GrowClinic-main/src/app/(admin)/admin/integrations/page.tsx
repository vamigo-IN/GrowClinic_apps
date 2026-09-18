import React from "react";
import { prisma } from "@/lib/prisma";
import { saveIntegrations, checkIntegrationStatus, type ToolStatus } from "./actions";
import { requireAdmin } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Integrations & Tracking | Admin",
};

function StatusBadge({ status }: { status: ToolStatus }) {
    const map = {
        live: { label: "Connected · Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
        configured: { label: "Saved · not live yet", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
        invalid: { label: "Invalid ID format", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
        off: { label: "Not configured", cls: "bg-[var(--a-hover)] text-[var(--a-muted)] border-[var(--a-border)]", dot: "bg-slate-400" },
    } as const;
    const s = map[status];
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${s.cls}`}>
            <span className={`h-2 w-2 rounded-full ${s.dot} ${status === "live" ? "animate-pulse" : ""}`} />
            {s.label}
        </span>
    );
}

const TOOLS = [
    {
        key: "ga4Id" as const,
        name: "Google Analytics 4",
        desc: "Measurement ID — find it in GA4 → Admin → Data Streams.",
        placeholder: "G-XXXXXXXXXX",
        statusKey: "ga4" as const,
    },
    {
        key: "gtmId" as const,
        name: "Google Tag Manager",
        desc: "Container ID — manage all your tags from one place.",
        placeholder: "GTM-XXXXXXX",
        statusKey: "gtm" as const,
    },
    {
        key: "metaPixelId" as const,
        name: "Meta Pixel",
        desc: "Pixel ID (numeric) — from Meta Events Manager.",
        placeholder: "1234567890123456",
        statusKey: "pixel" as const,
    },
];

// Already wired into the site (code/env) — shown here for live status only.
const AUTODETECT = [
    {
        name: "Microsoft Clarity",
        desc: "Heatmaps & session recordings (clarity.ms).",
        value: "u3ju4tpj50",
        statusKey: "clarity" as const,
    },
    {
        name: "Google Search Console",
        desc: "Verified via the verification file in your site root.",
        value: "/google336e0d5180b0f72d.html",
        statusKey: "gsc" as const,
    },
    {
        name: "Bing Webmaster Tools",
        desc: "Verified via the msvalidate.01 meta tag.",
        value: "89122CBA86D2D09B939C820E1AF40859",
        statusKey: "bing" as const,
    },
];

export default async function IntegrationsPage() {
    await requireAdmin();
    const settings = await prisma.siteSettings.findUnique({ where: { id: "global" } });
    const status = await checkIntegrationStatus();

    const values: Record<string, string> = {
        ga4Id: settings?.ga4Id || "",
        gtmId: settings?.gtmId || "",
        metaPixelId: settings?.metaPixelId || "",
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--a-bright)]">Integrations &amp; Tracking</h1>
                    <p className="mt-2 font-medium text-[var(--a-muted)]">
                        Connect your analytics tools and see — in real time — whether each one is actually live on the site.
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--a-muted)]">Live site</p>
                    <p className={`text-sm font-bold ${status.siteReachable ? "text-emerald-600" : "text-red-600"}`}>
                        {status.siteReachable ? "Reachable ✓" : "Unreachable ✗"}
                    </p>
                </div>
            </div>

            <form action={saveIntegrations} className="space-y-5">
                {TOOLS.map((tool) => (
                    <div
                        key={tool.key}
                        className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-panel)] p-6 shadow-sm sm:p-8"
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--a-bright)]">{tool.name}</h2>
                                <p className="mt-1 text-sm font-medium text-[var(--a-muted)]">{tool.desc}</p>
                            </div>
                            <StatusBadge status={status[tool.statusKey]} />
                        </div>
                        <input
                            name={tool.key}
                            defaultValue={values[tool.key]}
                            placeholder={tool.placeholder}
                            className="w-full rounded-[15px] border-[var(--a-border)] bg-[var(--a-bg)] px-4 py-3 font-mono text-sm text-[var(--a-text)] shadow-inner transition-all focus:border-primary focus:ring-primary"
                        />
                        <p className="mt-2 text-xs font-medium text-[var(--a-muted)]">
                            Provider ping:{" "}
                            <span className={status.provider[tool.statusKey] ? "font-bold text-emerald-600" : "text-[var(--a-faint)]"}>
                                {status.provider[tool.statusKey] ? "responding ✓" : "no response"}
                            </span>
                        </p>
                    </div>
                ))}

                <div className="flex items-center justify-between gap-4 rounded-[15px] border border-[var(--a-border)] bg-[var(--a-panel)] p-6 shadow-sm">
                    <p className="text-sm font-medium text-[var(--a-muted)]">
                        Each check validates the ID format, pings the provider&rsquo;s endpoint, and scans your live
                        site. &ldquo;Live&rdquo; means the tag is installed and the provider responds. A status of{" "}
                        <span className="font-bold text-amber-600">Saved &middot; not live yet</span> clears after the next
                        deploy or cache refresh.
                    </p>
                    <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-primary px-6 py-2.5 font-bold text-white transition-transform hover:-translate-y-0.5"
                    >
                        Save &amp; re-check
                    </button>
                </div>
            </form>

            {/* Auto-detected — set in code/env, shown here for live status only */}
            <div className="space-y-5">
                <div>
                    <h2 className="text-xl font-bold text-[var(--a-bright)]">Verification &amp; Heatmaps</h2>
                    <p className="mt-1 text-sm font-medium text-[var(--a-muted)]">
                        Already wired into the site — listed here so you can confirm they&rsquo;re live. These are managed in code/env, not editable here.
                    </p>
                </div>
                {AUTODETECT.map((tool) => (
                    <div
                        key={tool.statusKey}
                        className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-panel)] p-6 shadow-sm sm:p-8"
                    >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--a-bright)]">{tool.name}</h3>
                                <p className="mt-1 text-sm font-medium text-[var(--a-muted)]">{tool.desc}</p>
                            </div>
                            <StatusBadge status={status[tool.statusKey]} />
                        </div>
                        <p className="break-all font-mono text-sm text-[var(--a-muted)]">{tool.value}</p>
                        {tool.statusKey === "clarity" && (
                            <p className="mt-2 text-xs font-medium text-[var(--a-muted)]">
                                Provider ping:{" "}
                                <span className={status.provider.clarity ? "font-bold text-emerald-600" : "text-[var(--a-faint)]"}>
                                    {status.provider.clarity ? "responding ✓" : "no response"}
                                </span>
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-center text-xs font-medium text-[var(--a-muted)]">
                Last checked {new Date(status.checkedAt).toLocaleString()} · For custom/raw tags use{" "}
                <a href="/admin/settings" className="font-bold text-primary hover:underline">
                    Settings &amp; Tracking
                </a>
                .
            </p>
        </div>
    );
}
