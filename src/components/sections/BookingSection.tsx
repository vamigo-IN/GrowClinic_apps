"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Sparkles, Star, CheckCircle2, Calendar } from "lucide-react";
import Cal, { getCalApi } from "@calcom/embed-react";

export function BookingSection() {
    useEffect(() => {
        (async function () {
            const cal = await getCalApi({ "namespace": "30min" });
            cal("ui", {
                "cssVarsPerTheme": {
                    "light": { "cal-brand": "#3586FF" },
                    "dark": { "cal-brand": "#3586FF" }
                },
                "hideEventTypeDetails": true,
                "layout": "month_view"
            });
        })();
    }, []);

    return (
        <section id="book" className="py-32 bg-slate-50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

                    {/* Content Column */}
                    <div className="space-y-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                                <Award className="w-3 h-3" />
                                Growth Partnership
                            </div>
                            <h3 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                                Book Your <br />
                                <span className="text-gradient-primary italic">Strategy Session</span>
                            </h3>
                            <p className="mt-8 text-xl text-slate-600 font-medium leading-relaxed max-w-xl">
                                Work directly with our medical growth experts to build a custom patient acquisition machine for your practice.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {[
                                { title: "Custom Growth Roadmap", desc: "A data-backed plan tailored to your medical specialty." },
                                { title: "Competitor Intelligence", desc: "See exactly how other clinics in your area capture high-value patients." },
                                { title: "System Leak Audit", desc: "We'll identify leaks in your current funnel and provide instant fixes." }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="flex gap-6 group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center flex-shrink-0 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-xl tracking-tight mb-1 group-hover:text-primary transition-colors">{item.title}</h4>
                                        <p className="text-slate-600 font-medium">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-10 border-t border-slate-200">
                            <div className="flex flex-wrap items-center gap-8">
                                <div>
                                    <div className="flex -space-x-3 mb-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 overflow-hidden">
                                                <img src={`https://i.pravatar.cc/100?u=clinic-${i + 10}`} alt="Trust" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">500+ Clinics Scaled</p>
                                    </div>
                                </div>
                                <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Standard Check</p>
                                    <p className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Certified Strategic Agency
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA Column */}
                    <div className="relative">
                        <motion.div
                            key="cta"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-3xl border border-white relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[550px] w-full"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary mb-8 relative z-10">
                                <Calendar className="w-10 h-10" />
                            </div>

                            <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-4 relative z-10">Start Growing Today</h4>
                            <p className="text-slate-500 font-medium mb-10 max-w-sm relative z-10">
                                Select a convenient time below to speak directly with our growth experts.
                            </p>

                            <button
                                data-cal-namespace="30min"
                                data-cal-link="growclinic-connect-evky36/30min"
                                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true","theme":"auto"}'
                                className="w-full md:w-auto px-10 py-5 bg-primary text-white rounded-full font-black uppercase text-sm tracking-widest shadow-glow hover:-translate-y-1 transition-all duration-300 relative z-10"
                            >
                                Schedule Strategy Session
                            </button>

                            <div className="flex justify-center items-center gap-2 mt-8 relative z-10">
                                <div className="w-4 h-4 text-green-500"><CheckCircle2 className="w-full h-full" /></div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Free 30-Minute Value Call</p>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
}
