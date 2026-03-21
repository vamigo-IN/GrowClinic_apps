"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Play, ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";

export function HeroSync() {
    return (
        <section className="relative bg-[#0A0C10] pt-40 pb-32 overflow-hidden min-h-[90vh] flex items-center">
            {/* Advanced Background System */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 opacity-[0.03] bg-[url('/grid-pattern.svg')] bg-[length:30px_30px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
                    >
                        <div className="w-2 h-2 rounded-full bg-accent animate-ping"></div>
                        <span className="text-white/70 font-black text-[10px] uppercase tracking-[0.3em]">Next-Gen WhatsApp Engine</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.95] tracking-tighter"
                    >
                        Automate Your Clinic <br />
                        <span className="text-gradient italic">With Sync</span>
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl md:text-2xl text-slate-400 mb-14 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        The all-in-one WhatsApp automation system for forward-thinking clinics. 
                        Bookings, prescriptions, and bills — handled instantly.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full sm:w-auto"
                    >
                        <Button 
                            variant="primary" 
                            className="w-full sm:w-auto text-lg px-12 py-5 rounded-[2rem] shadow-glow flex items-center justify-center gap-3 group"
                            href="https://sync.growclinic.io/"
                            target="_blank"
                        >
                            Start Your Free Demo
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <button className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest group hover:text-accent transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all shadow-xl backdrop-blur-sm">
                                <Play className="w-6 h-6 fill-current" />
                            </div>
                            Watch Sync in Action
                        </button>
                    </motion.div>

                    {/* Premium Trust Architecture */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="mt-24 w-full max-w-5xl"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Elite Security", desc: "Enterprise-grade encryption", icon: ShieldCheck },
                                { title: "Instant Setup", desc: "Go live in under 24 hours", icon: Zap },
                                { title: "Global Scale", desc: "Powers 500+ clinics worldwide", icon: Globe },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center md:items-start p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl group hover:bg-white/[0.08] transition-all duration-500">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-white font-black text-lg tracking-tight mb-2">{item.title}</h4>
                                    <p className="text-slate-500 text-sm font-medium">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Aesthetic Transition */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
        </section>
    );
}
