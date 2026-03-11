"use client";

import React from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MessageSquare, Calendar, FileText, CheckCircle2, ArrowRight } from "lucide-react";

export function FeaturesSync() {
    const features = [
        {
            title: "24/7 WhatsApp AI Concierge",
            highlight: "Booking",
            desc: "Let patients book, reschedule, or cancel appointments via WhatsApp without human intervention. Our AI handles the heavy lifting.",
            points: [
                "Instant availability sync",
                "Conversational booking flow",
                "Automated reminders & follow-ups",
                "Reduced staff workload by 80%"
            ],
            icon: Calendar,
            imageSide: "right",
            bg: "bg-blue-50/50"
        },
        {
            title: "Zero-Click Digital",
            highlight: "Prescriptions",
            desc: "Generate and send professional prescriptions directly to the patient's WhatsApp window. No printing, no scanning, no delays.",
            points: [
                "Secure PDF generation",
                "Automatic patient history updates",
                "One-tap refill requests",
                "100% paperless clinic workflow"
            ],
            icon: FileText,
            imageSide: "left",
            bg: "bg-slate-50/50"
        },
        {
            title: "Instant Revenue &",
            highlight: "Billing",
            desc: "Send invoices and payment links instantly. Keep track of your clinic's financial health via a unified, real-time dashboard.",
            points: [
                "Automated billing on WhatsApp",
                "Real-time revenue tracking",
                "Payment link integration",
                "Financial reporting at a glance"
            ],
            icon: MessageSquare,
            imageSide: "right",
            bg: "bg-primary/5"
        }
    ];

    return (
        <section className="py-32 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    title="Scale Without"
                    highlight="Complexity"
                    subtitle="Powerful automation tools designed specifically for modern medical practices."
                    centered
                />

                <div className="mt-32 space-y-40">
                    {features.map((feature, index) => (
                        <div 
                            key={index} 
                            className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-32 ${feature.imageSide === 'left' ? 'lg:flex-row-reverse' : ''}`}
                        >
                            {/* Text Content */}
                            <motion.div 
                                initial={{ opacity: 0, x: feature.imageSide === 'right' ? -40 : 40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="flex-1"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 border border-slate-50">
                                    <feature.icon className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                                    {feature.title} <br />
                                    <span className="text-gradient italic">{feature.highlight}</span>
                                </h3>
                                <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                                
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                                    {feature.points.map((point, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            </div>
                                            <span className="text-slate-700 font-bold text-sm tracking-tight">{point}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-[0.2em] group">
                                    Learn more about Sync
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>

                            {/* visual Graphic - Premium Mockup */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1 }}
                                className="flex-1 w-full"
                            >
                                <div className={`relative aspect-square rounded-[3rem] ${feature.bg} p-12 flex items-center justify-center overflow-hidden`}>
                                    {/* Abstract UI Mockup */}
                                    <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
                                        {/* Mockup Header */}
                                        <div className="h-14 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                            </div>
                                            <div className="h-2 w-32 bg-slate-200 rounded-full mx-auto"></div>
                                        </div>
                                        
                                        {/* Mockup Content - Chat Style */}
                                        <div className="p-8 space-y-6">
                                            <div className="flex justify-start">
                                                <div className="bg-slate-100 rounded-[1.5rem] rounded-tl-none p-4 max-w-[80%]">
                                                    <div className="h-2 w-20 bg-slate-200 rounded-full mb-3"></div>
                                                    <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <div className="bg-primary rounded-[1.5rem] rounded-tr-none p-4 max-w-[80%] shadow-lg shadow-primary/20">
                                                    <div className="h-2 w-24 bg-white/30 rounded-full mb-3"></div>
                                                    <div className="h-2 w-full bg-white/20 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-start">
                                                <div className="bg-slate-100 rounded-[1.5rem] rounded-tl-none p-4 w-full">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                                                            <feature.icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="h-2 w-32 bg-slate-200 rounded-full"></div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                                                        <div className="h-2 w-2/3 bg-slate-200 rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Interactive Hover Glow */}
                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-[100px]"></div>
                                    </div>

                                    {/* Floating Elements */}
                                    <div className="absolute top-8 right-8 w-20 h-20 bg-accent rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                                    <div className="absolute bottom-8 left-8 w-20 h-20 bg-primary rounded-full blur-[40px] opacity-20"></div>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
