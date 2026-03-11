"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { Search, ShieldAlert, BarChart3, Rocket, CheckCircle2, Loader2, Sparkles, MapPin, Phone, User, Building, ArrowUpRight } from "lucide-react";

export function AuditSection() {
    const [step, setStep] = useState<"form" | "calculating" | "report">("form");
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        clinicName: "",
        specialization: "Dentist",
        city: "",
        phone: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStep("calculating");

        // Simulate calculation delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        try {
            const res = await fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Submission failed");
            const data = await res.json();
            setReportData(data.report);
            setStep("report");
        } catch (error) {
            console.error(error);
            setStep("form");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="audit" className="py-32 bg-slate-900 relative overflow-hidden">
            {/* High-end decorative background */}
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="glass-morphism-dark rounded-[3.5rem] p-8 md:p-16 border border-white/10 shadow-3xl flex flex-col lg:flex-row gap-20 items-stretch min-h-[650px]">
                    
                    <div className="flex-1 flex flex-col justify-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8"
                        >
                            <Sparkles className="w-3 h-3" />
                            Elite Diagnostic Tool
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {step === "report" ? (
                                <motion.div
                                    key="report-title"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                                        Your Personalized <br />
                                        <span className="text-gradient italic">Growth Metrics</span>
                                    </h2>
                                    <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
                                        We've analyzed your local market. Here is the untapped patient potential waiting for your clinic.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form-title"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                                        Audit Your <br />
                                        <span className="text-gradient italic">Growth Potential</span>
                                    </h2>
                                    <p className="text-xl text-slate-400 font-medium mb-12 leading-relaxed max-w-xl">
                                        Stop guessing. Our AI-driven audit tool analyzes your city's search volume and competitor behavior to build your roadmap.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { icon: Search, label: "Competitor Analysis" },
                                            { icon: ShieldAlert, label: "Market Visibility" },
                                            { icon: BarChart3, label: "Conversion Gaps" },
                                            { icon: Rocket, label: "90-Day Roadmap" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4 group">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-widest text-[10px]">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <div className="w-full lg:w-[500px] flex items-center">
                        <AnimatePresence mode="wait">
                            {step === "calculating" ? (
                                <motion.div 
                                    key="calculating"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-8"
                                >
                                    <div className="relative">
                                        <Loader2 className="w-20 h-20 text-primary animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="w-4 h-4 bg-primary rounded-full animate-pulse"></span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">Analyzing Data</h3>
                                        <p className="text-slate-400 font-medium text-sm">Scanning competitors and patient intent signals in your city...</p>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: "0%" }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 2.5, ease: "easeInOut" }}
                                            className="h-full bg-primary-gradient"
                                        />
                                    </div>
                                </motion.div>
                            ) : step === "form" ? (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="w-full bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12"></div>
                                    
                                    <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    required
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                    placeholder="Your Full Name" 
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    required
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                    placeholder="Clinic Name" 
                                                    value={formData.clinicName}
                                                    onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <select 
                                                        className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-black text-slate-900 text-xs appearance-none uppercase tracking-widest cursor-pointer"
                                                        value={formData.specialization}
                                                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                                                    >
                                                        <option>Dentist</option>
                                                        <option>Derma</option>
                                                        <option>Ortho</option>
                                                        <option>IVF</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        type="text" 
                                                        required
                                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                        placeholder="City" 
                                                        value={formData.city}
                                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="tel" 
                                                    required
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                    placeholder="Phone Number" 
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full py-5 text-lg shadow-glow rounded-3xl" disabled={loading}>
                                            Generate Free Audit
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="report"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full bg-white rounded-[2.5rem] p-10 shadow-3xl flex flex-col items-center"
                                >
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-8">
                                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">Audit Complete</h3>
                                    <p className="text-slate-500 font-medium mb-10 text-center">Your growth signals are strong. View your core metrics below.</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">SEO Score</p>
                                            <p className="text-3xl font-black text-primary">{reportData?.seoScore}%</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Market Rank</p>
                                            <p className="text-3xl font-black text-slate-900">#{reportData?.competitorRank}</p>
                                        </div>
                                    </div>
                                    
                                    <Button onClick={() => window.location.href = "#book"} className="w-full py-5 shadow-glow rounded-3xl flex items-center justify-center gap-2">
                                        Claim Your 90-Day Roadmap
                                        <ArrowUpRight className="w-5 h-5" />
                                    </Button>
                                    <button 
                                        onClick={() => setStep("form")}
                                        className="mt-6 text-xs font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
                                    >
                                        Run New Diagnosis
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
