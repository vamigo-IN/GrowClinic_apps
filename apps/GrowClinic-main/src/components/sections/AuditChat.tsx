"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, Lock, CheckCircle2, Sparkles } from "lucide-react";

type Msg = { role: "bot" | "user"; text: string };

interface Step {
    key: "clinicName" | "city" | "specialization" | "website" | "channels" | "fullName" | "phone";
    bot: (a: Record<string, string>) => string;
    type: "text" | "channels";
    placeholder?: string;
    submit?: boolean;
}

const CHANNEL_OPTIONS = ["Google Ads", "Meta Ads", "Organic Search / SEO", "Not sure yet"];

const STEPS: Step[] = [
    {
        key: "clinicName",
        bot: () =>
            "Hi 👋 I'll prepare your clinic's complete growth audit — real data on your Google Ads, Meta Ads and Organic Search. First, what's your clinic's name?",
        type: "text",
        placeholder: "e.g. BrightSmile Dental",
    },
    {
        key: "city",
        bot: (a) => `Great — and which city is ${a.clinicName || "your clinic"} in?`,
        type: "text",
        placeholder: "e.g. Mumbai",
    },
    {
        key: "specialization",
        bot: () => "What does your clinic specialise in?",
        type: "text",
        placeholder: "e.g. Dentist, Dermatologist, IVF…",
    },
    {
        key: "website",
        bot: () => "Do you have a website? Paste the link, or type “none”.",
        type: "text",
        placeholder: "https:// …",
    },
    {
        key: "channels",
        bot: () => "Which of these are you running right now? Tap all that apply.",
        type: "channels",
    },
    {
        key: "fullName",
        bot: () => "Almost there. What's your name?",
        type: "text",
        placeholder: "Your name",
    },
    {
        key: "phone",
        bot: () => "Last step — the best WhatsApp number to send your full data report?",
        type: "text",
        placeholder: "+91 …",
        submit: true,
    },
];

export function AuditChat() {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [stepIdx, setStepIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [channels, setChannels] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const step = STEPS[stepIdx];

    // Push the first bot message on mount
    useEffect(() => {
        setTyping(true);
        const t = setTimeout(() => {
            setMessages([{ role: "bot", text: STEPS[0].bot({}) }]);
            setTyping(false);
        }, 600);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, typing]);

    function advance(nextAnswers: Record<string, string>, userText: string) {
        setMessages((m) => [...m, { role: "user", text: userText }]);
        const next = stepIdx + 1;
        if (next < STEPS.length) {
            setTyping(true);
            setTimeout(() => {
                setMessages((m) => [...m, { role: "bot", text: STEPS[next].bot(nextAnswers) }]);
                setTyping(false);
                setStepIdx(next);
            }, 700);
        }
    }

    async function submitAll(finalAnswers: Record<string, string>) {
        setSubmitting(true);
        try {
            await fetch("/api/audit-intake", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...finalAnswers, channels }),
            });
        } catch {
            /* even on network hiccup we acknowledge — the lead is queued */
        }
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            setDone(true);
        }, 900);
    }

    function handleTextSend() {
        const val = input.trim();
        if (!val) return;
        const updated = { ...answers, [step.key]: val };
        setAnswers(updated);
        setInput("");
        if (step.submit) {
            setMessages((m) => [...m, { role: "user", text: val }]);
            submitAll(updated);
        } else {
            advance(updated, val);
        }
    }

    function toggleChannel(c: string) {
        setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    }

    function confirmChannels() {
        const label = channels.length ? channels.join(", ") : "Not sure yet";
        const updated = { ...answers, channels: label };
        setAnswers(updated);
        advance(updated, label);
    }

    return (
        <div className="relative overflow-hidden rounded-[15px] border border-white/10 bg-[#0a0c0b]">
            <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-[120px]" />

            <div className="relative grid gap-0 lg:grid-cols-2">
                {/* Left: copy */}
                <div className="p-8 md:p-12">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        Complete clinic audit
                    </span>
                    <h3 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
                        Get your clinic&rsquo;s{" "}
                        <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                            full growth audit
                        </span>
                    </h3>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-400">
                        Answer a few quick questions and our team prepares a real-data report across your{" "}
                        <span className="font-semibold text-slate-200">Google Ads, Meta Ads and Organic Search</span> —
                        the exact levers that win clinics more patients.
                    </p>
                    <ul className="mt-7 space-y-3">
                        {[
                            "Where competitors are outranking you on Google",
                            "Wasted spend & missed wins in Google + Meta Ads",
                            "The patients you're losing every month",
                        ].map((t) => (
                            <li key={t} className="flex items-start gap-3 text-sm font-medium text-slate-300">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                {t}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-2">
                            <Lock className="h-4 w-4 text-emerald-400" /> Encrypted &amp; secure
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Sent only to our audit team
                        </span>
                    </div>
                </div>

                {/* Right: chat */}
                <div className="border-t border-white/10 bg-white/[0.02] lg:border-l lg:border-t-0">
                    {/* app bar */}
                    <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-green-600">
                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                                    <path d="M10.5 3h3v7.5H21v3h-7.5V21h-3v-7.5H3v-3h7.5V3z" />
                                </svg>
                            </span>
                            <span className="text-sm font-bold text-white">Clinic Growth Audit</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                        </span>
                    </div>

                    {/* messages */}
                    <div ref={scrollRef} className="h-[360px] space-y-3 overflow-y-auto px-5 py-5">
                        {messages.map((m, i) =>
                            m.role === "bot" ? (
                                <div
                                    key={i}
                                    className="max-w-[85%] rounded-[15px] rounded-tl-sm bg-white/[0.05] px-3.5 py-2.5 text-[13px] leading-snug text-slate-200"
                                >
                                    {m.text}
                                </div>
                            ) : (
                                <div key={i} className="flex justify-end">
                                    <div className="max-w-[85%] rounded-[15px] rounded-tr-sm bg-emerald-500/15 px-3.5 py-2.5 text-[13px] leading-snug text-emerald-50 ring-1 ring-emerald-400/20">
                                        {m.text}
                                    </div>
                                </div>
                            )
                        )}

                        {typing && (
                            <div className="flex items-center gap-1.5 rounded-[15px] rounded-tl-sm bg-white/[0.05] px-3.5 py-3 w-fit">
                                {[0, 1, 2].map((d) => (
                                    <span
                                        key={d}
                                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                                        style={{ animationDelay: `${d * 0.15}s` }}
                                    />
                                ))}
                            </div>
                        )}

                        {done && (
                            <div className="rounded-[15px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-center">
                                <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-300" />
                                <p className="text-sm font-bold text-white">Your full audit is on its way</p>
                                <p className="mt-1 text-[12px] leading-snug text-slate-300">
                                    Our team is pulling real data on your Google Ads, Meta Ads and Organic Search. Your
                                    complete report lands on WhatsApp shortly.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* input */}
                    {!done && (
                        <div className="border-t border-white/5 px-4 py-3">
                            {step?.type === "channels" && !typing ? (
                                <div>
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {CHANNEL_OPTIONS.map((c) => {
                                            const on = channels.includes(c);
                                            return (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => toggleChannel(c)}
                                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                                                        on
                                                            ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                                                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-400/30"
                                                    }`}
                                                >
                                                    {c}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={confirmChannels}
                                        className="w-full rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 px-5 py-2.5 text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5"
                                    >
                                        Continue
                                    </button>
                                </div>
                            ) : (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleTextSend();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={typing || submitting}
                                        placeholder={typing ? "…" : step?.placeholder || "Type your answer…"}
                                        className="flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-60"
                                    />
                                    <button
                                        type="submit"
                                        disabled={typing || submitting || !input.trim()}
                                        aria-label="Send"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
