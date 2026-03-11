"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, MessageSquare, ArrowRight, Star, Zap } from "lucide-react";

export function CTASync() {
    return (
        <section className="bg-white pt-32 pb-48 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-[600px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Guarantee Card - Glassmorphism */}
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto bg-slate-50/50 backdrop-blur-xl rounded-[3rem] border border-slate-100 p-12 md:p-20 mb-32 relative group hover:bg-white transition-all duration-700 shadow-2xl shadow-slate-200/50"
                >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-glow border-4 border-white rotate-12 group-hover:rotate-0 transition-transform duration-500">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="text-center">
                        <div className="flex justify-center gap-1 mb-6">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                            ))}
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 tracking-tight">The Sync <span className="text-gradient">Guarantee</span></h3>
                        
                        <div className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium italic relative">
                            <span className="absolute -top-8 -left-8 text-8xl text-slate-200 pointer-events-none font-serif opacity-50">"</span>
                            <p className="relative z-10">
                                If Sync doesn't save your staff at least 10 hours in the first 30 days, I will personally refund your investment. No questions asked. 
                                We're that confident in the engine we've built.
                            </p>
                            <span className="absolute -bottom-16 -right-8 text-8xl text-slate-200 pointer-events-none font-serif opacity-50">"</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent p-1">
                                <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                                     <img src="https://i.pravatar.cc/150?u=riya" alt="Founder" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-black text-slate-900 text-lg tracking-tight">Riya Rajput</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Founder, GrowClinic.io</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Final CTA Area - High Intensity */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-5xl mx-auto bg-[#0A0C10] rounded-[4rem] p-12 md:p-24 shadow-glow-lg relative overflow-hidden group"
                >
                    {/* Animated grid background */}
                    <div className="absolute inset-0 opacity-[0.05] bg-[url('/grid-pattern.svg')] bg-[length:30px_30px] group-hover:opacity-[0.08] transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                            <Zap className="w-4 h-4 text-accent fill-accent" />
                            <span className="text-white/70 font-black text-[10px] uppercase tracking-[0.3em]">Limited Partnerships Available</span>
                        </div>
                        
                        <h2 className="text-4xl md:text-7xl font-black text-white mb-10 leading-[0.95] tracking-tighter">
                            Ready to Claim <br />
                            <span className="text-gradient italic">Your Edge?</span>
                        </h2>
                        
                        <p className="text-xl text-slate-400 mb-14 max-w-2xl mx-auto font-medium leading-relaxed">
                            Join the elite 1% of clinics using surgical-grade WhatsApp automation to dominate their local market.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <Button variant="primary" className="w-full sm:w-auto text-xl px-12 py-6 rounded-[2.5rem] shadow-glow flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95">
                                Start Your Demo
                                <ArrowRight className="w-6 h-6" />
                            </Button>
                            <button className="flex items-center gap-3 text-white font-black uppercase text-xs tracking-[0.2em] group px-8 py-6 rounded-[2.5rem] border border-white/10 hover:bg-white/5 transition-all">
                                <MessageSquare className="w-5 h-5 text-accent" />
                                Chat with Support
                            </button>
                        </div>
                        
                        <div className="mt-12 flex items-center justify-center gap-8 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Live in 24h
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                No hidden fees
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                cancel anytime
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
