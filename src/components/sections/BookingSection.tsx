"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Calendar, Clock, User, Mail, Phone, Building, MessageSquare, Award, Sparkles, Star } from "lucide-react";

export function BookingSection() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        clinicName: "",
        clinicType: "",
        challenge: "",
        preferredDate: "",
        preferredTime: "",
    });

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to submit booking");

            setStatus("success");
            setFormData({
                name: "",
                email: "",
                phone: "",
                clinicName: "",
                clinicType: "",
                challenge: "",
                preferredDate: "",
                preferredTime: "",
            });
        } catch (error) {
            console.error("Booking error:", error);
            setStatus("error");
        }
    };

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
                                                <img src={`https://i.pravatar.cc/100?u=clinic-${i+10}`} alt="Trust" />
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

                    {/* Form Column */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {status === "success" ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-white rounded-[3.5rem] p-12 text-center shadow-3xl border border-primary/20 min-h-[650px] flex flex-col items-center justify-center"
                                >
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-primary-gradient flex items-center justify-center text-white mb-8 shadow-glow">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 mb-4">Discovery Confirmed</h2>
                                    <p className="text-slate-500 mb-12 text-lg font-medium leading-relaxed max-w-sm">
                                        Our strategy leads are reviewing your practice. We'll be in touch shortly to finalize your custom roadmap.
                                    </p>
                                    <Button onClick={() => setStatus("idle")} variant="outline" className="px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest">
                                        Return Home
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0, x: 30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-3xl border border-white relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                                    
                                    <div className="mb-10">
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">The Growth Audit</h4>
                                        <p className="text-slate-400 font-medium">Please provide accurate practice details.</p>
                                    </div>
                                    
                                    <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
                                                    placeholder="Full Name"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
                                                    placeholder="Work Email"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
                                                    placeholder="Phone Number"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="clinicName"
                                                    required
                                                    value={formData.clinicName}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
                                                    placeholder="Clinic Name"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <select
                                                name="clinicType"
                                                required
                                                value={formData.clinicType}
                                                onChange={handleChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-black text-slate-900 text-xs appearance-none cursor-pointer uppercase tracking-widest"
                                            >
                                                <option value="" disabled>Select Practice Specialty...</option>
                                                <option value="Dental Clinic">Dental Clinic</option>
                                                <option value="Dermatology Clinic">Dermatology Clinic</option>
                                                <option value="Cosmetology Clinic">Cosmetology / Aesthetic Clinic</option>
                                                <option value="Hair Clinic">Hair / Trichology Clinic</option>
                                                <option value="Multi-speciality">Multi-speciality Clinic</option>
                                                <option value="Hospital">Hospital</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-5 w-4 h-4 text-slate-400" />
                                            <textarea
                                                name="challenge"
                                                rows={3}
                                                required
                                                value={formData.challenge}
                                                onChange={handleChange}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm resize-none"
                                                placeholder="Growth goal for the next 6 months?"
                                            ></textarea>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        name="preferredDate"
                                                        required
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={formData.preferredDate}
                                                        onChange={handleChange}
                                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-slate-900 text-sm cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Time</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                    <select
                                                        name="preferredTime"
                                                        required
                                                        value={formData.preferredTime}
                                                        onChange={handleChange}
                                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-black text-slate-900 text-xs appearance-none cursor-pointer uppercase tracking-widest"
                                                    >
                                                        <option value="" disabled>Select Time Slot</option>
                                                        <option value="09:00 AM">09:00 AM</option>
                                                        <option value="11:00 AM">11:00 AM</option>
                                                        <option value="01:00 PM">01:00 PM</option>
                                                        <option value="03:00 PM">03:00 PM</option>
                                                        <option value="05:00 PM">05:00 PM</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <Button type="submit" className="w-full py-5 shadow-glow rounded-3xl font-black uppercase text-xs tracking-widest" disabled={status === "loading"}>
                                                {status === "loading" ? "Processing..." : "Secure My Strategy Session"}
                                            </Button>
                                            <div className="flex justify-center items-center gap-2 mt-6">
                                                <div className="w-3 h-3 text-green-500"><CheckCircle2 className="w-full h-full" /></div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Confidential & Secure Link</p>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </section>
    );
}
