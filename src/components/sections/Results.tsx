"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "../ui/SectionHeading";
import { TrendingUp, BarChart3, Users, CheckCircle2, ArrowUpRight } from "lucide-react";

export function Results() {
    const [activeTab, setActiveTab] = useState(0);

    const results = [
        {
            label: "Organic Patient Growth",
            metric: "+340%",
            subMetric: "Traffic",
            desc: "Dominating local search results. We helped a multi-chair dental clinic in Mumbai increase organic patient inquiries by over 3x in just 6 months.",
            chartPath: "M0 90 C 20 85, 40 40, 60 45 S 80 10, 100 0",
            icon: TrendingUp
        },
        {
            label: "Ad Conversion Rate",
            metric: "5.2x",
            subMetric: "ROI",
            desc: "Precision-targeted patient acquisition. Our expert-managed Google Ads campaigns consistently outperform industry benchmarks for cost-per-appointment.",
            chartPath: "M0 95 C 10 90, 30 70, 50 75 S 70 20, 100 15",
            icon: BarChart3
        },
        {
            label: "Patient Retention",
            metric: "+65%",
            subMetric: "Loyalty",
            desc: "Building lasting clinical foundations. Automated follow-up systems and reputation management that turn one-time visitors into lifelong patients.",
            chartPath: "M0 80 C 20 80, 40 60, 60 65 S 80 40, 100 35",
            icon: Users
        }
    ];

    return (
        <section id="results" className="py-32 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <SectionHeading 
                    title={<>Real Growth <br /><span className="text-gradient italic">Scientifically</span> Measured</>}
                    subtitle="Measurable scaling driven by medical-niche expertise and proprietary acquisition systems."
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-20">
                    {/* Interactive Side - Metrics Selection */}
                    <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
                        {results.map((res, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`group w-full text-left p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden ${activeTab === index
                                        ? "border-primary/10 bg-slate-50 shadow-xl -translate-y-1"
                                        : "border-slate-100 hover:border-slate-200 bg-white"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeTab === index ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"}`}>
                                            <res.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className={`font-black text-lg transition-colors duration-300 ${activeTab === index ? "text-slate-900" : "text-slate-500"}`}>
                                                {res.label}
                                            </h4>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeTab === index ? "bg-white border-primary/10 text-primary" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
                                                {res.subMetric}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-3xl font-black tracking-tighter transition-all duration-500 ${activeTab === index ? "text-primary scale-110" : "text-slate-200"}`}>
                                        {res.metric}
                                    </span>
                                </div>
                                <p className={`text-sm leading-relaxed font-medium transition-colors duration-300 ${activeTab === index ? "text-slate-600" : "text-slate-400"}`}>
                                    {res.desc}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Visualization Side - Main Chart */}
                    <div className="lg:col-span-7 order-1 lg:order-2 w-full">
                        <motion.div 
                            layout
                            className="bg-white rounded-[3.5rem] p-8 lg:p-12 relative overflow-hidden border border-slate-100 shadow-2xl min-h-[550px] flex flex-col justify-between"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-6 mb-12 relative z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary-gradient flex items-center justify-center text-white shadow-glow">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Global Status</p>
                                        <h4 className="font-black text-slate-900">Verified Scale</h4>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {results.map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i === activeTab ? "bg-primary w-6" : "bg-slate-100"} transition-all duration-500`}></div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Chart SVG */}
                            <div className="relative flex-1 flex items-end">
                                <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="w-full h-px bg-slate-50"></div>
                                    ))}
                                </div>

                                <svg className="w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    <AnimatePresence mode="wait">
                                        <motion.g key={activeTab}>
                                            <motion.path
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{ duration: 1, ease: "easeInOut" }}
                                                d={`${results[activeTab].chartPath} L 100 100 L 0 100 Z`}
                                                fill="url(#chartGradient)"
                                            />
                                            <motion.path
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 1.2, ease: "easeInOut" }}
                                                d={results[activeTab].chartPath}
                                                fill="none"
                                                stroke="#3b82f6"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                            />
                                        </motion.g>
                                    </AnimatePresence>
                                </svg>

                                <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-2">
                                    {['Setup', 'Month 3', 'Month 6'].map((m, i) => (
                                        <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{m}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-16 flex items-center justify-between border-t border-slate-50 pt-8 relative z-20">
                                <div className="text-[10px] font-black text-slate-600 flex items-center gap-2 uppercase tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    Real-time Performance Data
                                </div>
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                            <img src={`https://i.pravatar.cc/100?u=${i + 40}`} alt="Clinic Partner" />
                                        </div>
                                    ))}
                                    <div className="w-10 h-10 rounded-full border-4 border-white bg-primary text-white text-[10px] font-black flex items-center justify-center">
                                        +100
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
