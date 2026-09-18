"use client";

import React, { useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, Activity, CheckCircle2, ChevronDown } from "lucide-react";
import { COUNTRY_CODES } from "@/lib/countryCodes";

const AUDIT_TOOL_URL = "https://audit.growclinic.io";

const SPECIALIZATIONS = [
    "Dentist",
    "Dermatologist",
    "Gynecologist",
    "Orthopedic",
    "IVF / Fertility",
    "Pediatrician",
    "Ophthalmologist",
    "ENT",
    "Cardiologist",
    "Physiotherapist",
    "Cosmetic Surgeon",
    "General Physician",
    "Multispecialty Hospital",
    "Other",
];

export function EmbeddedAuditForm() {
    const [form, setForm] = useState({
        fullName: "",
        clinicName: "",
        specialization: "",
        city: "",
        countryCode: "+91",
        phone: "",
        website: "",
    });
    const [status, setStatus] = useState<"idle" | "loading">("idle");

    const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading");

        // Capture attribution from the current URL
        let utmSource = "growclinic-site";
        let utmCampaign = "";
        let referrer = "";
        try {
            const cur = new URLSearchParams(window.location.search);
            utmSource = cur.get("utm_source") || utmSource;
            utmCampaign = cur.get("utm_campaign") || "";
            referrer = document.referrer || "";
        } catch {
            /* ignore */
        }

        // Generate a unique click-ID for this audit CTA submission (hidden — used
        // only for attribution; carried via the webhook and into the audit tool).
        let clickId = `gc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
            if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
                clickId = `gc_${crypto.randomUUID()}`;
            }
        } catch {
            /* keep fallback id */
        }

        // Full phone in international format (country code + number)
        const fullPhone = `${form.countryCode} ${form.phone}`.trim();

        // 1) Store the lead + attributes in our backend (also securely forwarded to the
        //    audit tool). The response carries a one-time secure-handoff token/URL.
        let handoffUrl: string | null = null;
        let handoffToken: string | null = null;
        try {
            const res = await fetch("/api/audit-intake", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, phone: fullPhone, pinCode: "", clickId, utmSource, utmCampaign, referrer }),
            });
            const data = await res.json().catch(() => ({}));
            handoffUrl = data?.handoffUrl || null;
            handoffToken = data?.handoffToken || null;
        } catch {
            /* even if this fails we still hand off to the audit tool */
        }

        // 2a) Preferred: secure token handoff — no PII ever rides in the URL.
        if (handoffUrl || handoffToken) {
            const path = handoffUrl || `/?t=${handoffToken}`;
            window.location.href = /^https?:\/\//i.test(path) ? path : `${AUDIT_TOOL_URL}${path.startsWith("/") ? "" : "/"}${path}`;
            return;
        }

        // 2b) Fallback (token unavailable): the legacy prefill redirect.
        const params = new URLSearchParams({
            prefill: "1",
            clinic: form.clinicName,
            city: form.city,
            specialty: form.specialization,
            name: form.fullName,
            phone: fullPhone,
            website: form.website,
            utm_source: utmSource,
            gclid: clickId,
        });
        if (utmCampaign) params.set("utm_campaign", utmCampaign);
        window.location.href = `${AUDIT_TOOL_URL}/?${params.toString()}`;
    }

    return (
        <div className="relative overflow-hidden rounded-[15px] border border-white/10 bg-[#0a0c0b] p-8 md:p-12">
            <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />

            <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
                {/* Copy */}
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-gradient-to-r from-emerald-400/10 to-green-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">
                            Instant growth audit
                        </span>
                    </span>
                    <h3 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
                        See your clinic&rsquo;s{" "}
                        <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
                            real growth score
                        </span>
                    </h3>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-400">
                        A benchmarked, real-data report across your{" "}
                        <span className="font-semibold text-slate-200">Google Ads, Meta Ads and Organic Search</span> —
                        the exact levers that win clinics more patients.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-blue-400" /> Private &amp; secure
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-400" /> Results in ~150 seconds
                        </span>
                    </div>
                </div>

                {/* Form */}
                <div className="rounded-[15px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input
                                required
                                value={form.fullName}
                                onChange={update("fullName")}
                                placeholder="Your name"
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/50"
                            />
                            <input
                                required
                                value={form.clinicName}
                                onChange={update("clinicName")}
                                placeholder="Clinic name"
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/50"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <select
                                required
                                value={form.specialization}
                                onChange={update("specialization")}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-400/50 [&>option]:text-slate-900"
                            >
                                <option value="" disabled>
                                    Specialty
                                </option>
                                {SPECIALIZATIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <input
                                required
                                value={form.city}
                                onChange={update("city")}
                                placeholder="City"
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="relative w-[112px] shrink-0">
                                <select
                                    required
                                    value={form.countryCode}
                                    onChange={update("countryCode")}
                                    aria-label="Country code"
                                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-blue-400/50 [&>option]:text-slate-900"
                                >
                                    {COUNTRY_CODES.map((cc) => (
                                        <option key={cc.code + cc.country} value={cc.code}>
                                            {cc.flag} {cc.code}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                            <input
                                required
                                type="tel"
                                value={form.phone}
                                onChange={update("phone")}
                                placeholder="WhatsApp number"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/50"
                            />
                        </div>
                        <input
                            value={form.website}
                            onChange={update("website")}
                            placeholder="Website (optional)"
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/50"
                        />

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 px-6 py-3.5 font-extrabold text-white shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                        >
                            {status === "loading" ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" /> Starting your audit…
                                </>
                            ) : (
                                <>
                                    Start my audit <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                        <p className="text-center text-[11px] font-medium text-slate-500">
                            You&rsquo;ll continue inside our secure audit tool to get your full report.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
