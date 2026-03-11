"use client";

import React from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MessageSquare, Bell, LayoutDashboard, Share2 } from "lucide-react";

export function StepsSync() {
    const steps = [
        {
            title: "Conversational Booking",
            desc: "Patients see available slots and book instantly through a natural, AI-guided WhatsApp flow.",
            icon: MessageSquare
        },
        {
            title: "Automated Reminders",
            desc: "System sends perfectly timed reminders to eliminate no-shows and confirm attendance.",
            icon: Bell
        },
        {
            title: "Unified Management",
            desc: "Handle prescriptions, bills, and history from a surgical-grade clinic dashboard.",
            icon: LayoutDashboard
        },
        {
            title: "Instant Sharing",
            desc: "Share documents and follow-ups instantly via WhatsApp — creating a seamless loop.",
            icon: Share2
        }
    ];

    return (
        <section className="py-32 bg-[#0A0C10] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <SectionHeading
                    title="Engineered for"
                    highlight="Simplicity"
                    subtitle="A seamless 4-step experience for both your clinic and your patients."
                    dark
                    centered
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mt-24 relative">
                    {/* Connecting line for desktop */}
                    <div className="hidden lg:block absolute top-[2.5rem] left-[12.5%] right-[12.5%] h-px bg-white/10 -z-0"></div>

                    {steps.map((step, index) => (
                        <motion.div 
                            key={index} 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative text-center group"
                        >
                            <div className="w-20 h-20 mx-auto bg-[#1a1f26] rounded-[2rem] border border-white/10 flex flex-col items-center justify-center shadow-2xl group-hover:border-primary group-hover:bg-primary/20 transition-all duration-500 mb-8 z-10 relative group-hover:-translate-y-2">
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white border-4 border-[#0A0C10]">
                                    0{index + 1}
                                </div>
                                <step.icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <h3 className="text-xl font-black mb-4 text-white tracking-tight group-hover:text-primary transition-colors">{step.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
