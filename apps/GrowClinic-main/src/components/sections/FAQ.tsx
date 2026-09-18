"use client";

import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { faqs } from "@/lib/faqData";

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a,
            },
        })),
    };

    return (
        <section className="py-32 bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    title="Strategic Insights"
                    highlight="FAQ"
                    subtitle="Everything you need to know about scaling your medical practice with GrowClinic's expert engineering team."
                    centered
                />

                <div className="mt-20 space-y-6">
                    {faqs.map((faq, index) => (
                        <m.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`group rounded-[15px] border transition-all duration-500 overflow-hidden ${
                                openIndex === index 
                                    ? 'border-primary/20 bg-slate-50/50 shadow-2xl shadow-slate-200/50' 
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100/50'
                            }`}
                        >
                            <button
                                className="w-full text-left px-8 py-7 flex items-center justify-between focus:outline-none"
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                        openIndex === index ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}>
                                        <HelpCircle className="w-5 h-5" />
                                    </div>
                                    <span className={`font-black text-xl tracking-tight transition-colors ${
                                        openIndex === index ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                                    }`}>
                                        {faq.q}
                                    </span>
                                </div>
                                <div className={`flex-shrink-0 ml-4 transition-transform duration-500 ${openIndex === index ? 'rotate-180' : ''}`}>
                                    {openIndex === index ? (
                                        <Minus className="w-6 h-6 text-primary" />
                                    ) : (
                                        <Plus className="w-6 h-6 text-slate-300" />
                                    )}
                                </div>
                            </button>

                            <AnimatePresence>
                                {openIndex === index && (
                                    <m.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        <div className="px-8 pb-8 pt-2">
                                            <div className="h-px bg-slate-100 mb-6 w-full opacity-50"></div>
                                            <p className="text-slate-600 text-lg leading-relaxed font-medium pl-14 pr-4">
                                                {faq.a}
                                            </p>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </m.div>
                    ))}
                </div>

            </div>

            {/* Post-FAQ CTA — sits outside the narrow max-w-4xl column, uses site-standard max-w-7xl */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-blue-700 px-8 py-16 sm:px-16 text-center shadow-2xl shadow-primary/30">
                        {/* Background glow blobs */}
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-[100px]" />
                            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-[100px]" />
                        </div>

                        <div className="relative z-10">
                            <p className="text-white/60 font-bold uppercase tracking-[0.25em] text-xs mb-4">Free Clinic Audit</p>
                            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-5 leading-tight">
                                Find out what&apos;s stopping<br className="hidden sm:block" /> your clinic from growing
                            </h3>
                            <p className="text-white/70 text-lg font-medium max-w-xl mx-auto mb-10 leading-relaxed">
                                Get a personalised growth audit in 60 seconds. See exactly where patients are dropping off and what to fix first.
                            </p>
                            <a
                                href="https://audit.growclinic.io"
                                className="inline-flex items-center justify-center gap-3 bg-white text-primary font-black px-10 py-4 rounded-2xl hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 uppercase tracking-widest text-sm group"
                            >
                                Audit Your Clinic — It&apos;s Free
                                <Plus className="w-4 h-4 rotate-45 group-hover:rotate-90 transition-transform duration-300" />
                            </a>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-6">No sign-up required · Takes 60 seconds</p>
                        </div>
                    </div>
                </m.div>
            </div>
        </section>
    );
}
