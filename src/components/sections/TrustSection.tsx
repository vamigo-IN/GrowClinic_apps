"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, Target, Shield, Heart } from "lucide-react";

const stats = [
    { label: "Clinics Served", value: "50+", subtext: "Across India", icon: Activity },
    { label: "Monthly Leads", value: "10000+", subtext: "High-intent patients", icon: Target },
    { label: "Avg. ROI", value: "3.7X", subtext: "Industry Leading", icon: Shield },
    { label: "Patient Growth", value: "142%", subtext: "Quarterly Avg.", icon: Heart },
];

export function TrustSection() {
    return (
        <section className="py-32 bg-slate-50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('/grid-pattern.svg')] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white hover:shadow-2xl transition-all duration-500 overflow-hidden relative group"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-110 transition-all">
                                <stat.icon className="w-24 h-24" />
                            </div>

                            <div className="relative z-10">
                                <div className="text-4xl md:text-5xl font-black text-primary mb-4 tracking-tighter">
                                    {stat.value}
                                </div>
                                <div className="text-lg font-black text-slate-900 mb-1">{stat.label}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{stat.subtext}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Authority Logos */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="mt-32 pt-16 border-t border-slate-200"
                >
                    <p className="text-center text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-16">
                        Powering Growth For Specialized Medical Practices
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-12 lg:gap-x-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        {["SURGERY", "DENTAL", "DERMATOLOGY", "IVF CLINICS", "PEDIATRICS", "CARDIOLOGY"].map((spec) => (
                            <div key={spec} className="text-lg md:text-xl font-black text-slate-900 hover:text-primary transition-colors cursor-default tracking-tighter">{spec}</div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
