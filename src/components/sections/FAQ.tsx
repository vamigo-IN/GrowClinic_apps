"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";

export function FAQ() {
    const faqs = [
        {
            q: "What is healthcare digital marketing?",
            a: "Healthcare digital marketing involves specialized strategies like medical SEO, HIPAA-compliant lead generation, and patient-centric website design specifically engineered to help medical professionals attract high-value patients."
        },
        {
            q: "Why hire a specialized healthcare agency?",
            a: "Healthcare marketing requires deep understanding of patient psychology, clinical trust signals, and strict regulatory compliance. General agencies often miss the subtle nuances that drive medical practice growth."
        },
        {
            q: "How soon can I expect results?",
            a: "While organic growth (SEO) takes 3-6 months to mature, our accelerated patient acquisition systems (Ads) typically begin generating verified patient inquiries within the first 14 days of activation."
        },
        {
            q: "Are there long-term contracts?",
            a: "We operate on performance and trust. While complex medical funnels require 90 days to fully optimize, we offer flexible month-to-month agreements because we believe in earning your business through results."
        },
        {
            q: "Do you specialize in my medical field?",
            a: "Yes. We have built high-performance systems for specialists ranging from Dental Surgeons and Aesthetic Dermatologists to IVF Clinics and Multi-specialty Hospitals."
        }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-32 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    title="Strategic Insights"
                    highlight="FAQ"
                    subtitle="Everything you need to know about scaling your medical practice with GrowClinic's elite engineering team."
                    centered
                />

                <div className="mt-20 space-y-6">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`group rounded-[2rem] border transition-all duration-500 overflow-hidden ${
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
                                    <motion.div
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
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">Still have questions?</p>
                    <a 
                        href="#book" 
                        className="inline-flex items-center gap-2 text-primary font-black hover:gap-4 transition-all uppercase tracking-widest text-sm"
                    >
                        Schedule a Strategy Audit
                        <Plus className="w-4 h-4 rotate-45" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
