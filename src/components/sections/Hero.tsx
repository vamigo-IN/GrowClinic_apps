"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Sparkles, ArrowRight, ShieldCheck, TrendingUp, Users } from "lucide-react";

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center bg-white pt-32 pb-20 overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-mesh-gradient opacity-40"></div>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/5 border border-primary/10 mb-8 backdrop-blur-sm"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-primary text-xs font-black uppercase tracking-[0.2em]">India’s Elite Health-Tech Agency</span>
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 mb-10 leading-[0.95] tracking-tight"
                    >
                        Scale Your Practice <br className="hidden md:block" />
                        <span className="text-gradient-primary italic">Dominate</span> Your City
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl md:text-2xl text-slate-600 mb-14 max-w-3xl mx-auto leading-relaxed font-medium"
                    >
                        We engineer patient acquisition systems for elite doctors and clinics. 
                        Join 100+ medical leaders who have automated their clinic's growth.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                    >
                        <Button variant="primary" className="group shadow-glow text-lg px-12 py-5 rounded-[2rem] transition-all hover:scale-105 active:scale-95">
                            Book Growth Audit
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button variant="outline" className="text-lg px-12 py-5 rounded-[2rem] border-slate-200 hover:bg-slate-50 font-bold">
                            View Case Studies
                        </Button>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
                    >
                        {[
                            { icon: Users, label: "500k+ Patients Generated", color: "text-blue-500" },
                            { icon: ShieldCheck, label: "HIPAA Compliant Agency", color: "text-green-500" },
                            { icon: TrendingUp, label: "12x Average Account ROI", color: "text-accent" }
                        ].map((badge, i) => (
                            <div key={i} className="flex items-center justify-center gap-3 px-6 py-4 rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-50">
                                <badge.icon className={`w-5 h-5 ${badge.color}`} />
                                <span className="text-sm font-bold text-slate-700">{badge.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
            
            {/* Visual flair - floating elements */}
            <div className="absolute top-1/2 left-0 w-24 h-24 bg-primary/10 rounded-3xl blur-3xl animate-float opacity-50"></div>
            <div className="absolute bottom-1/4 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl animate-float-delayed opacity-50"></div>
        </section>
    );
}
