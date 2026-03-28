"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { Search, ShieldAlert, BarChart3, Rocket, CheckCircle2, Loader2, Sparkles, MapPin, Phone, User, Building, ArrowUpRight, Globe, AlertCircle, TrendingUp } from "lucide-react";

export function AuditSection() {
    const [step, setStep] = useState<"form" | "calculating" | "report">("form");
    const [loading, setLoading] = useState(false);
    const [loadingStepText, setLoadingStepText] = useState("Analyzing Data");
    const [reportData, setReportData] = useState<any>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        clinicName: "",
        specialization: "Dentist",
        city: "",
        phone: "",
        website: "",
        pinCode: ""
    });

    // Dynamic loading texts to simulate real analysis
    useEffect(() => {
        if (step === "calculating") {
            const steps = [
                `Connecting to Local Search Grid for ${formData.pinCode || formData.city}...`,
                `Scanning Google Maps profile for "${formData.clinicName}"...`,
                formData.website ? `Analyzing technical SEO for ${formData.website}...` : "Checking domain availability...",
                "Calculating competitor dominance...",
                "Generating personalized 90-day roadmap..."
            ];
            let i = 0;
            const interval = setInterval(() => {
                i++;
                if (i < steps.length) {
                    setLoadingStepText(steps[i]);
                }
            }, 1000); // changes text every 1 second
            return () => clearInterval(interval);
        }
    }, [step, formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStep("calculating");
        setLoadingStepText(`Connecting to Local Search Grid for ${formData.pinCode || formData.city}...`);

        // Simulate a longer, more believable calculation delay
        await new Promise(resolve => setTimeout(resolve, 5000));

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
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="glass-morphism-dark rounded-[3.5rem] p-8 md:p-16 border border-white/10 shadow-3xl flex flex-col lg:flex-row gap-12 lg:gap-20 items-stretch min-h-[650px]">
                    
                    {/* Left Column Text / Value Prop */}
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
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                                        Your Personalized <br />
                                        <span className="text-gradient italic">Growth Metrics</span>
                                    </h2>
                                    <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl mb-8">
                                        We've analyzed the search dominance for <strong className="text-white">{formData.clinicName}</strong> in <strong>{formData.pinCode || formData.city}</strong>.
                                    </p>
                                    
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Rocket className="w-5 h-5 text-accent" />
                                            Instant Action Plan
                                        </h4>
                                        <ul className="space-y-3">
                                            {reportData?.roadmap?.slice(0, 3).map((item: string, idx: number) => (
                                                <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                                                    <div className="w-5 h-5 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-primary text-[10px] font-bold">{idx + 1}</span>
                                                    </div>
                                                    <span className="leading-snug">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form-title"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                                        Check your Clinic <br />
                                        <span className="text-gradient italic">Digital Health</span>
                                    </h2>
                                    <p className="text-lg text-slate-400 font-medium mb-12 leading-relaxed max-w-xl">
                                        Stop guessing. Provide your clinic details and let our AI-driven tool analyze your local search volume, map visibility, and SEO health instantly.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { icon: Search, label: "Competitor Analysis" },
                                            { icon: MapPin, label: "Local Map Grid Check" },
                                            { icon: ShieldAlert, label: "Technical SEO Audit" },
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
                    
                    {/* Right Column Form / Loader / Report Dashboard */}
                    <div className="w-full lg:w-[500px] xl:w-[550px] flex items-center">
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
                                    <div className="h-16 flex flex-col justify-center">
                                        <AnimatePresence mode="wait">
                                            <motion.h3 
                                                key={loadingStepText}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="text-lg font-bold text-white mb-2"
                                            >
                                                {loadingStepText}
                                            </motion.h3>
                                        </AnimatePresence>
                                        <p className="text-slate-400 font-medium text-xs">This will just take a few seconds...</p>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: "0%" }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 5, ease: "linear" }}
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
                                    className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12"></div>
                                    
                                    <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
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
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                    placeholder="Clinic Name" 
                                                    value={formData.clinicName}
                                                    onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <select 
                                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-black text-slate-900 text-xs appearance-none uppercase tracking-widest cursor-pointer"
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
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        type="tel" 
                                                        required
                                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                        placeholder="Phone Number" 
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* New Search Grid Fields */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        type="text" 
                                                        required
                                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                        placeholder="City" 
                                                        value={formData.city}
                                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        type="text" 
                                                        required
                                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                        placeholder="Pin Code" 
                                                        value={formData.pinCode}
                                                        onChange={(e) => setFormData({...formData, pinCode: e.target.value})} // New Field
                                                    />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="url" 
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm" 
                                                    placeholder="Website URL (e.g. https://myclinic.com) (Optional)" 
                                                    value={formData.website}
                                                    onChange={(e) => setFormData({...formData, website: e.target.value})} // New Field
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full py-4 mt-2 text-md shadow-glow rounded-xl" disabled={loading}>
                                            Generate Local SEO Audit
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="report"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-3xl text-slate-900"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
                                        <div>
                                            <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                Audit Complete
                                            </h3>
                                            <p className="text-slate-500 text-xs font-medium">Report generated for {formData.pinCode}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-block bg-primary/10 text-primary font-black text-2xl px-4 py-2 rounded-xl">
                                                {reportData?.seoScore}<span className="text-sm font-medium text-slate-500 ml-1">/ 100</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Overall Health</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> Map Visibility
                                                </p>
                                                <div className="flex items-end gap-2">
                                                    <p className={`text-2xl font-black ${reportData?.localVisibilityScore > 50 ? 'text-green-600' : 'text-orange-500'}`}>
                                                        {reportData?.localVisibilityScore}%
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> Web Health
                                                </p>
                                                <div className="flex items-end gap-2">
                                                    <p className={`text-2xl font-black ${reportData?.websiteHealthScore > 60 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {reportData?.websiteHealthScore}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">GMB Profile Status</p>
                                                <p className="text-sm font-bold text-slate-900">{reportData?.googleBusinessStatus}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                {reportData?.googleBusinessStatus === "Optimized" ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-orange-500" />
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Missed Potential</p>
                                                <p className="text-sm font-medium text-slate-700">~<strong className="text-slate-900 text-lg">{reportData?.estimatedLeads}</strong> local searches/mo lost to competitors</p>
                                            </div>
                                            <TrendingUp className="w-8 h-8 text-primary opacity-50" />
                                        </div>
                                    </div>
                                    
                                    <Button onClick={() => window.location.href = "#book"} className="w-full py-4 shadow-glow rounded-xl flex items-center justify-center gap-2">
                                        Discuss Your Strategy Report
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Button>
                                    <button 
                                        onClick={() => setStep("form")}
                                        className="mt-4 w-full text-center text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
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
