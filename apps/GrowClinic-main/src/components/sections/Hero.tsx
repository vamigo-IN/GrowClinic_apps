"use client";

import React, { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "../ui/Button";
import {
    ArrowRight,
    Star,
    Stethoscope,
    Search,
    Facebook,
    MessageCircle,
    MapPin,
    TrendingUp,
} from "lucide-react";

const PRACTICES = ["Dental Clinic", "Skin Clinic", "Hospital", "IVF Centre", "Practice"];

// "Our top clients" — healthcare niches we serve widely
const CLIENTS = [
    "Aesthetic",
    "Ayurveda",
    "Trichology",
    "Dental",
    "Dermatology",
];

// Bar colours: lightest (near-white blue) on the left → deepest blue on the right
const BAR_BLUES = ["#eff6ff", "#cfe3fb", "#9fc5f8", "#6ba6f5", "#3b82f6", "#2563eb", "#1d4ed8"];

// Gamified, rotating marketing-channel tile
type Channel = {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    metric: string;
    unit: string;
    delta: string;
    score: number; // 0-100 growth score for the ring
    bars: number[];
};

const CHANNELS: Channel[] = [
    { name: "Google Ads", icon: Search, color: "#FBBC04", metric: "+127", unit: "new patients", delta: "▲ 34%", score: 82, bars: [40, 55, 48, 70, 62, 85, 100] },
    { name: "Meta Ads", icon: Facebook, color: "#0082FB", metric: "+89", unit: "qualified leads", delta: "▲ 28%", score: 76, bars: [30, 45, 60, 52, 74, 68, 92] },
    { name: "WhatsApp", icon: MessageCircle, color: "#25D366", metric: "+212", unit: "patient chats", delta: "▲ 41%", score: 91, bars: [50, 62, 58, 80, 72, 95, 100] },
    { name: "Google Maps", icon: MapPin, color: "#00A3EE", metric: "Top 3", unit: "map ranking", delta: "▲ 6 spots", score: 88, bars: [35, 50, 55, 65, 78, 88, 96] },
    { name: "AEO · GEO · SEO", icon: TrendingUp, color: "#DE7356", metric: "+64", unit: "organic calls", delta: "▲ 19%", score: 73, bars: [28, 40, 52, 47, 66, 70, 84] },
];

const RING_R = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

export function Hero() {
    const [practiceIdx, setPracticeIdx] = useState(0);
    const [chanIdx, setChanIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setPracticeIdx((i) => (i + 1) % PRACTICES.length), 3400);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const id = setInterval(() => setChanIdx((i) => (i + 1) % CHANNELS.length), 4200);
        return () => clearInterval(id);
    }, []);

    const ch = CHANNELS[chanIdx];

    return (
        <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-slate-950 pb-20 pt-24 sm:min-h-[92vh] sm:pb-24 sm:pt-28">
            {/* Animated glows — hidden on mobile (heavy blur hurts paint perf) */}
            <div className="animate-float pointer-events-none absolute left-[60%] top-[-10%] hidden h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/25 blur-[150px] sm:block" />
            <div className="animate-float-delayed pointer-events-none absolute bottom-[-15%] left-[0%] hidden h-[400px] w-[400px] rounded-full bg-emerald-500/15 blur-[130px] sm:block" />
            {/* Grid texture */}
            <div className="pointer-events-none absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.06]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/0 to-slate-950" />

            <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
                {/* ---- Left: copy ---- */}
                <div className="text-center lg:text-left">
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
                    >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                            <Stethoscope className="h-3 w-3" />
                        </span>
                        <span className="text-size-tiny text-weight-bold uppercase tracking-[0.16em] text-white/80">
                            Digital marketing for doctors &amp; clinics
                        </span>
                    </m.div>

                    {/* Heading — LCP element: rendered immediately (no entrance fade) so it
                        paints at first render instead of waiting for hydration. */}
                    <h1 className="heading-style-h1 text-white">
                        <span className="block">More patients</span>
                        <span className="block">for your</span>
                        <span className="relative mt-1 flex min-h-[1.1em] items-start justify-center overflow-hidden lg:justify-start">
                            <AnimatePresence mode="wait" initial={false}>
                                <m.span
                                    key={practiceIdx}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -24 }}
                                    transition={{ duration: 0.4 }}
                                    className="inline-block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text pb-[0.08em] text-transparent"
                                >
                                    {PRACTICES[practiceIdx]}
                                </m.span>
                            </AnimatePresence>
                        </span>
                    </h1>

                    {/* Tight, consistent subheading */}
                    <m.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mx-auto mt-6 max-w-md text-lg font-medium leading-relaxed text-slate-300 lg:mx-0"
                    >
                        Patient-acquisition systems for clinics — we find where your growth leaks, then fix it.
                    </m.p>

                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:items-start lg:justify-start"
                    >
                        {/* Clean, matching CTA pair */}
                        <Link
                            href="https://audit.growclinic.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-green group inline-flex w-full items-center justify-center rounded-lg px-7 py-3.5 text-base font-bold sm:w-auto"
                        >
                            <Stethoscope className="mr-2 h-4.5 w-4.5" />
                            Audit Your Clinic
                            <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/case-studies"
                            className="btn-ghost inline-flex w-full items-center justify-center rounded-lg px-7 py-3.5 text-base font-bold sm:w-auto"
                        >
                            See Case Studies
                        </Link>
                    </m.div>

                    {/* Our top clients */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
                    >
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Our top clients
                        </span>
                        {CLIENTS.map((c) => (
                            <span
                                key={c}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300"
                            >
                                {c}
                            </span>
                        ))}
                    </m.div>
                </div>

                {/* ---- Right: gamified, rotating channel dashboard ---- */}
                <m.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="relative mx-auto hidden w-full max-w-md lg:block"
                >
                    <div className="relative rounded-[15px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl">
                        {/* Channel tabs — single inline row, native colors when active */}
                        <div className="mb-6 flex flex-nowrap items-center gap-1 overflow-hidden">
                            {CHANNELS.map((c, i) => {
                                const active = i === chanIdx;
                                return (
                                    <span
                                        key={c.name}
                                        className="whitespace-nowrap rounded-[4px] border px-2 py-1 text-[9px] font-bold transition-all duration-700"
                                        style={{
                                            borderColor: active ? c.color : "rgba(255,255,255,0.07)",
                                            background: active ? `${c.color}22` : "rgba(255,255,255,0.02)",
                                            color: active ? "#fff" : "rgba(148,163,184,0.65)",
                                        }}
                                    >
                                        {c.name}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <m.span
                                    key={`icon-${chanIdx}`}
                                    initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                                    className="flex h-11 w-11 items-center justify-center rounded-[15px] text-white shadow-lg"
                                    style={{ backgroundColor: ch.color }}
                                >
                                    <ch.icon className="h-5 w-5" />
                                </m.span>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        This month
                                    </p>
                                    <AnimatePresence mode="wait">
                                        <m.p
                                            key={`name-${chanIdx}`}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.3 }}
                                            className="font-black text-white"
                                        >
                                            {ch.name}
                                        </m.p>
                                    </AnimatePresence>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                            </span>
                        </div>

                        {/* Big metric + gamified growth-score ring */}
                        <div className="flex items-center justify-between">
                            <div>
                                <AnimatePresence mode="wait">
                                    <m.p
                                        key={`metric-${chanIdx}`}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -14 }}
                                        transition={{ duration: 0.35 }}
                                        className="text-5xl font-black tracking-tight text-white"
                                    >
                                        {ch.metric}
                                    </m.p>
                                </AnimatePresence>
                                <p className="mt-1 text-sm font-semibold text-emerald-400">
                                    {ch.delta} <span className="text-slate-500">· {ch.unit}</span>
                                </p>
                            </div>

                            {/* Growth score ring */}
                            <div className="relative h-[68px] w-[68px]">
                                <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
                                    <circle cx="34" cy="34" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                                    <m.circle
                                        key={`ring-${chanIdx}`}
                                        cx="34"
                                        cy="34"
                                        r={RING_R}
                                        fill="none"
                                        stroke={ch.color}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={RING_CIRC}
                                        initial={{ strokeDashoffset: RING_CIRC }}
                                        animate={{ strokeDashoffset: RING_CIRC * (1 - ch.score / 100) }}
                                        transition={{ duration: 0.9, ease: "easeOut" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <m.span
                                            key={`score-${chanIdx}`}
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.7 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-base font-black text-white"
                                        >
                                            {ch.score}
                                        </m.span>
                                    </AnimatePresence>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">score</span>
                                </div>
                            </div>
                        </div>

                        {/* Bar chart — bars step from near-white (left) to deep blue (right) */}
                        <div className="mt-5 flex h-16 items-end gap-2">
                            {ch.bars.map((h, i) => (
                                <m.span
                                    key={`${chanIdx}-${i}`}
                                    className="flex-1 rounded-t-[3px]"
                                    style={{ backgroundColor: BAR_BLUES[i % BAR_BLUES.length] }}
                                    initial={{ height: "8%" }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Floating 4.9 review chip */}
                    <div className="animate-float-delayed absolute -right-5 -top-5 flex items-center gap-2 rounded-[15px] border border-white/10 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <p className="text-xs font-bold text-white">
                            New review · <span className="text-amber-300">4.9</span>
                        </p>
                    </div>

                </m.div>
            </div>
        </section>
    );
}
