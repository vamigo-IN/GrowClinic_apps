import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
    Phone,
    MessageCircle,
    ArrowRight,
    Search,
    MapPin,
    Gauge,
    BarChart3,
    CheckCircle2,
    ShieldCheck,
    Lock,
    Clock,
    Stethoscope,
    TrendingUp,
    CalendarCheck,
    FileText,
    Sparkles,
    Star,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Config — single source of truth for CTAs + contact details        */
/* ------------------------------------------------------------------ */
const AUDIT_TOOL_URL = "https://audit.growclinic.io";
const CALL_TEL = "+917287774212";
const CALL_DISPLAY = "+91 72877 74212";
const WHATSAPP_URL =
    "https://wa.me/916393355243?text=" +
    encodeURIComponent("Hi GrowClinic, I'd like a growth audit for my clinic.");
const LEGAL_EMAIL = "riya@cloutrr.com";

export const metadata: Metadata = {
    title: "Clinic Growth Audit Tool | GrowClinic",
    description:
        "Find out exactly where your clinic is losing new patients. Our interactive audit checks your Google visibility, website speed and patient-booking flow, then delivers a benchmarked report and a personalised 90-day growth plan. Built for doctors, dentists, dermatologists and multispecialty clinics.",
    alternates: { canonical: "https://www.growclinic.io/audit" },
    openGraph: {
        title: "Clinic Growth Audit Tool | GrowClinic",
        description:
            "See exactly where your clinic is losing patients — Google visibility, site speed and booking flow — with a benchmarked report and a 90-day growth plan.",
        url: "https://www.growclinic.io/audit",
    },
};

/* ------------------------------------------------------------------ */
/*  Content data                                                       */
/* ------------------------------------------------------------------ */
const heroTrust = ["500+ clinics audited", "Live benchmarks", "Encrypted & private"];

const personas = [
    { label: "Dental clinic", q: "dental" },
    { label: "Cosmetic / skin clinic", q: "aesthetics" },
    { label: "Multispecialty hospital", q: "multispecialty" },
];

const steps = [
    {
        icon: Stethoscope,
        title: "Tell us about your clinic",
        desc: "Name, city and what you treat. Takes about a minute — no long forms, no sales call required.",
    },
    {
        icon: Search,
        title: "We analyse you live",
        desc: "We scan your Google presence, maps visibility, website speed and booking flow against real local competitors.",
    },
    {
        icon: BarChart3,
        title: "You get benchmarked scores",
        desc: "Clear 0–100 scores showing exactly where you stand versus other clinics in your speciality and city.",
    },
    {
        icon: FileText,
        title: "Receive your 90-day plan",
        desc: "A prioritised, plain-English report with the specific fixes that will bring you the most new patients first.",
    },
];

const reveals = [
    {
        icon: BarChart3,
        title: "Online visibility score",
        desc: "A 0–100 rating of how findable your clinic is when patients search for your services today.",
    },
    {
        icon: MapPin,
        title: "Google Maps presence",
        desc: "Whether nearby patients actually see you in the local map pack — or your competitors instead.",
    },
    {
        icon: Gauge,
        title: "Website speed & UX",
        desc: "How fast your site loads on mobile and where slow pages are quietly costing you bookings.",
    },
    {
        icon: CalendarCheck,
        title: "Patient-booking flow",
        desc: "Every point of friction between an interested patient and a confirmed appointment.",
    },
    {
        icon: Search,
        title: "Local competitor rank",
        desc: "Where you sit against other clinics for your speciality in your city, with the gaps to close.",
    },
    {
        icon: TrendingUp,
        title: "Patients you're missing",
        desc: "An honest estimate of the local searches slipping to competitors every single month.",
    },
];

const audience = [
    "Doctors & physicians",
    "Dentists & dental clinics",
    "Dermatologists & skin clinics",
    "Aesthetic & cosmetic clinics",
    "IVF & fertility centres",
    "Multispecialty hospitals",
];

const trustPoints = [
    {
        icon: ShieldCheck,
        title: "Honest, benchmarked data",
        desc: "Scores are measured against real clinics in your market — not vanity numbers designed to sell you.",
    },
    {
        icon: Lock,
        title: "Private & encrypted",
        desc: "Single-session and end-to-end encrypted. Your details are never resold or shared with third parties.",
    },
    {
        icon: Clock,
        title: "Fast & no obligation",
        desc: "The audit takes about a minute and there is zero pressure. Use the plan yourself or with us.",
    },
];

const faqs = [
    {
        q: "How much does it cost?",
        a: "Start with an instant snapshot of where your clinic stands at no cost. For a deeper dive, you can upgrade to a detailed report (7–8 pages) or a full growth blueprint (13–15 pages) — affordable, one-time, with pricing shown for your region before you pay.",
    },
    {
        q: "How long does it take?",
        a: "About 150 seconds to enter your clinic details. The analysis runs live and your report is ready right after.",
    },
    {
        q: "What information do you need?",
        a: "Just your clinic name, city and what you treat. We use public data and live checks — we never ask for patient records or sensitive medical data.",
    },
    {
        q: "Is my data safe?",
        a: "Your session is encrypted and single-use. We do not resell your data. For any legal or data questions you can reach us directly at " + LEGAL_EMAIL + ".",
    },
    {
        q: "Which clinics is this for?",
        a: "Doctors, dentists, dermatologists, aesthetic and cosmetic clinics, fertility centres and multispecialty hospitals — anywhere that wants more of the right patients.",
    },
];

/* ------------------------------------------------------------------ */
/*  Inline brand mark (swap for /images/logo-audit.png later)          */
/* ------------------------------------------------------------------ */
function LogoMark() {
    return (
        <span className="inline-flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600">
                <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
                    <path d="M10.5 3h3v7.5H21v3h-7.5V21h-3v-7.5H3v-3h7.5V3z" />
                </svg>
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
                GrowClinic<span className="text-emerald-400">.io</span>
            </span>
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Looping phone demo — chat → analysing → report (pure CSS, no file) */
/* ------------------------------------------------------------------ */
function PhoneDemo() {
    return (
        <div className="relative mx-auto w-full max-w-[300px]">
            {/* soft accent glow behind the phone */}
            <div className="pointer-events-none absolute -inset-6 rounded-[15px] bg-emerald-500/10 blur-3xl" />

            <div className="relative rounded-[15px] border border-white/10 bg-[#0d100f] p-3 shadow-2xl">
                {/* notch */}
                <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/10" />

                <div className="overflow-hidden rounded-[1.9rem] bg-[#0a0d0c] ring-1 ring-white/5">
                    {/* app bar */}
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-green-600">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="currentColor">
                                    <path d="M10.5 3h3v7.5H21v3h-7.5V21h-3v-7.5H3v-3h7.5V3z" />
                                </svg>
                            </span>
                            <span className="text-xs font-bold text-white">Clinic Growth Audit</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                        </span>
                    </div>

                    {/* chat area */}
                    <div className="relative h-[340px] space-y-3 px-4 py-4">
                        {/* bot greeting (static) */}
                        <div className="max-w-[80%] rounded-[15px] rounded-tl-sm bg-white/[0.05] px-3 py-2 text-[11px] leading-snug text-slate-300">
                            Hi 👋 Tell me about your clinic — name, city and what you treat.
                        </div>

                        {/* doctor message */}
                        <div className="audit-demo-user flex justify-end">
                            <div className="max-w-[80%] rounded-[15px] rounded-tr-sm bg-emerald-500/15 px-3 py-2 text-[11px] leading-snug text-emerald-50 ring-1 ring-emerald-400/20">
                                BrightSmile Dental, Austin — 3 dentists, implants & whitening.
                            </div>
                        </div>

                        {/* analysing + report share the lower zone (overlap) */}
                        <div className="absolute inset-x-4 bottom-4">
                            {/* analysing */}
                            <div className="audit-demo-analyze flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
                                    <Search className="h-3.5 w-3.5 text-emerald-400" />
                                </span>
                                <div className="flex items-center gap-2 rounded-[15px] rounded-tl-sm bg-white/[0.05] px-3 py-2 text-[11px] text-slate-300">
                                    Analysing your clinic
                                    <span className="flex gap-1">
                                        <span className="audit-demo-dot h-1 w-1 rounded-full bg-emerald-400" />
                                        <span className="audit-demo-dot h-1 w-1 rounded-full bg-emerald-400" />
                                        <span className="audit-demo-dot h-1 w-1 rounded-full bg-emerald-400" />
                                    </span>
                                </div>
                            </div>

                            {/* report card */}
                            <div className="audit-demo-report rounded-[15px] border border-emerald-400/20 bg-[#0f1512] p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-white">Your growth report</span>
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                                        Ready
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { l: "Google visibility", v: 62 },
                                        { l: "Website speed", v: 48 },
                                        { l: "Booking flow", v: 71 },
                                    ].map((r) => (
                                        <div key={r.l} className="flex items-center gap-2">
                                            <span className="w-24 shrink-0 text-[10px] text-slate-400">{r.l}</span>
                                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                                <span
                                                    className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                                                    style={{ width: `${r.v}%` }}
                                                />
                                            </span>
                                            <span className="w-6 text-right text-[10px] font-bold text-white">{r.v}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200">
                                    <CheckCircle2 className="h-3 w-3" /> 90-day growth plan attached
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* input bar */}
                    <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2.5">
                        <div className="flex-1 rounded-full bg-white/[0.05] px-3 py-1.5 text-[10px] text-slate-500">
                            Tell us about your clinic…
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600">
                            <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </span>
                    </div>
                </div>
            </div>

            <p className="mt-3 text-center text-xs font-medium text-slate-500">
                Chat → live analysis → report, in seconds.
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AuditLandingPage() {
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-[#0a0c0b] text-slate-200 antialiased selection:bg-emerald-500/30">
            {/* ---- Sticky header ---- */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0c0b]/85 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                    <Link href="/" aria-label="GrowClinic home">
                        <LogoMark />
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <a
                            href={`tel:${CALL_TEL}`}
                            className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-emerald-400/40 hover:text-white sm:inline-flex"
                        >
                            <Phone className="h-4 w-4 text-emerald-400" />
                            {CALL_DISPLAY}
                        </a>
                        <a
                            href={AUDIT_TOOL_URL}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 px-5 py-2 text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5"
                        >
                            Start audit
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </header>

            {/* ---- Hero (two-column: copy + looping phone demo) ---- */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute -top-40 left-1/4 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[150px]" />

                <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 md:pt-20 lg:grid-cols-2 lg:gap-8 lg:px-8">
                    {/* Copy */}
                    <div className="text-center lg:text-left">
                        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            150-second clinic growth audit
                        </span>

                        <h1 className="text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-[3.4rem]">
                            Find out exactly where your clinic is{" "}
                            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                                losing new patients
                            </span>
                            .
                        </h1>

                        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0">
                            Take the interactive audit. We analyse your Google visibility, website speed and
                            patient-booking flow, then deliver a benchmarked report with a personalised 90-day
                            growth plan — in plain English.
                        </p>

                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                            <a
                                href={AUDIT_TOOL_URL}
                                className="inline-flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-gradient-to-br from-emerald-400 to-green-600 px-8 py-4 text-lg font-extrabold text-white shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-transform hover:-translate-y-0.5 sm:w-auto"
                            >
                                Start my audit
                                <ArrowRight className="h-5 w-5" />
                            </a>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2.5 rounded-[15px] border border-white/12 px-6 py-4 text-base font-bold text-slate-100 transition-colors hover:border-emerald-400/40 hover:text-white sm:w-auto"
                            >
                                <MessageCircle className="h-5 w-5 text-emerald-400" />
                                Or chat on WhatsApp
                            </a>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                            <span className="text-sm font-semibold text-slate-500">I run a</span>
                            {personas.map((p) => (
                                <a
                                    key={p.q}
                                    href={`${AUDIT_TOOL_URL}?type=${p.q}`}
                                    className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm font-bold text-slate-300 transition-colors hover:border-emerald-400/40 hover:text-white"
                                >
                                    {p.label}
                                </a>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-500 lg:justify-start">
                            {heroTrust.map((t) => (
                                <span key={t} className="inline-flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Looping phone demo */}
                    <div className="order-first lg:order-last">
                        <PhoneDemo />
                    </div>
                </div>
            </section>

            {/* ---- Why it matters / the idea ---- */}
            <section className="border-y border-white/5 bg-white/[0.015] py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            Most clinics lose patients before they ever call
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-400">
                            Patients choose a clinic in seconds — based on what they find on Google, how fast
                            your site loads, and how easy it is to book. If any link in that chain is weak, those
                            patients quietly go to a competitor. The audit shows you precisely where that&rsquo;s
                            happening, and what to fix first.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 sm:grid-cols-3">
                        {trustPoints.map((t) => (
                            <div key={t.title} className="rounded-[15px] border border-white/8 bg-white/[0.03] p-7">
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/15">
                                    <t.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t.title}</h3>
                                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- How it works ---- */}
            <section className="py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
                            How it works
                        </span>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            Four simple steps to your growth plan
                        </h2>
                    </div>

                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map((s, i) => (
                            <div key={s.title} className="relative rounded-[15px] border border-white/8 bg-white/[0.03] p-7">
                                <span className="absolute right-6 top-6 text-5xl font-black text-white/[0.04]">
                                    {i + 1}
                                </span>
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/15">
                                    <s.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- What your report reveals ---- */}
            <section className="border-y border-white/5 bg-white/[0.015] py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            What your report reveals
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-400">
                            A clear, honest snapshot of where your clinic stands — and exactly where the growth
                            is hiding.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {reveals.map((r) => (
                            <div
                                key={r.title}
                                className="rounded-[15px] border border-white/8 bg-white/[0.025] p-7 transition-colors hover:border-emerald-400/25"
                            >
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/15">
                                    <r.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{r.title}</h3>
                                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- Who it's for ---- */}
            <section className="py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="rounded-[15px] border border-white/8 bg-white/[0.03] p-10 text-center md:p-14">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            Built for every kind of practice
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
                            Next-gen digital marketing and growth, tailored to your speciality.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            {audience.map((a) => (
                                <span
                                    key={a}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200"
                                >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    {a}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ---- Social proof band ---- */}
            <section className="border-y border-white/5 bg-white/[0.015] py-14">
                <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 text-center sm:px-6 md:grid-cols-4 lg:px-8">
                    {[
                        { n: "500+", l: "Clinics audited" },
                        { n: "60s", l: "To your results" },
                        { n: "90-day", l: "Growth plan" },
                        { n: "100%", l: "Private & secure" },
                    ].map((s) => (
                        <div key={s.l}>
                            <p className="text-4xl font-black text-white">
                                {s.n}
                            </p>
                            <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                {s.l}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---- FAQ ---- */}
            <section className="py-20">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">FAQ</span>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            Questions, answered
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((f) => (
                            <details
                                key={f.q}
                                className="group rounded-[15px] border border-white/8 bg-white/[0.03] p-6 [&_summary]:cursor-pointer"
                            >
                                <summary className="flex list-none items-center justify-between text-base font-bold text-white marker:content-[''] [&::-webkit-details-marker]:hidden">
                                    {f.q}
                                    <span className="ml-4 text-emerald-400 transition-transform group-open:rotate-45">
                                        +
                                    </span>
                                </summary>
                                <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- Final CTA ---- */}
            <section className="px-4 pb-24 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[15px] border border-emerald-400/15 bg-gradient-to-br from-emerald-600/10 via-[#0d100f] to-[#0a0c0b] p-10 text-center md:p-16">
                    <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
                    <div className="relative">
                        <div className="mb-5 flex justify-center gap-1 text-emerald-400">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-5 w-5 fill-current" />
                            ))}
                        </div>
                        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                            See where your next 10 patients are hiding
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
                            Run your audit now. No obligation — just a clear plan to grow your clinic.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <a
                                href={AUDIT_TOOL_URL}
                                className="inline-flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-gradient-to-br from-emerald-400 to-green-600 px-8 py-4 text-lg font-extrabold text-white shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-transform hover:-translate-y-0.5 sm:w-auto"
                            >
                                Start my audit
                                <ArrowRight className="h-5 w-5" />
                            </a>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2.5 rounded-[15px] border border-white/12 px-6 py-4 text-base font-bold text-slate-100 transition-colors hover:border-emerald-400/40 hover:text-white sm:w-auto"
                            >
                                <MessageCircle className="h-5 w-5 text-emerald-400" />
                                Message us on WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---- Footer ---- */}
            <footer className="border-t border-white/5 bg-[#070908]">
                <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-sm">
                            <LogoMark />
                            <p className="mt-4 text-sm leading-relaxed text-slate-400">
                                Next-gen digital marketing and patient-acquisition systems for doctors, dentists,
                                dermatologists and clinics worldwide.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 text-sm font-semibold">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                                Talk to us
                            </span>
                            <a
                                href={`tel:${CALL_TEL}`}
                                className="inline-flex items-center gap-2.5 text-slate-200 transition-colors hover:text-emerald-300"
                            >
                                <Phone className="h-4 w-4 text-emerald-400" /> {CALL_DISPLAY}
                            </a>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2.5 text-slate-200 transition-colors hover:text-emerald-300"
                            >
                                <MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp: +91 63933 55243
                            </a>
                            <a
                                href={`mailto:${LEGAL_EMAIL}`}
                                className="inline-flex items-center gap-2.5 text-slate-200 transition-colors hover:text-emerald-300"
                            >
                                <FileText className="h-4 w-4 text-emerald-400" /> Legal & partnerships: {LEGAL_EMAIL}
                            </a>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:flex-row">
                        <p>
                            © {year} GrowClinic · A brand of{" "}
                            <a
                                href="https://cloutrr.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 transition-colors hover:text-emerald-300"
                            >
                                Cloutrr Grow (OPC) Private Limited
                            </a>
                        </p>
                        <div className="flex gap-6">
                            <Link href="/privacy" className="transition-colors hover:text-emerald-300">
                                Privacy
                            </Link>
                            <Link href="/terms" className="transition-colors hover:text-emerald-300">
                                Terms
                            </Link>
                            <Link href="/" className="transition-colors hover:text-emerald-300">
                                Main site
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
