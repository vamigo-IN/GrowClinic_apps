"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AlertCircle, Clock, MessageSquareX, RotateCcw, Database, FileX } from "lucide-react";

export function ProblemSync() {
    const problems = [
        {
            title: "Leads Go Cold Fast",
            desc: "Manual follow-ups kill conversion. Patients expect instant responses, and every minute of delay is lost revenue.",
            icon: AlertCircle,
            color: "text-red-500",
            bg: "bg-red-50"
        },
        {
            title: "Overwhelmed Staff",
            desc: "Your team spends 60% of their day answering basic FAQs on WhatsApp instead of focusing on patient care.",
            icon: MessageSquareX,
            color: "text-orange-500",
            bg: "bg-orange-50"
        },
        {
            title: "Empty Time Slots",
            desc: "Without automated reminders, no-shows increase, leaving expensive clinic hours completely unbilled.",
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            title: "Scattered Records",
            desc: "Prescriptions and history lost in chat threads? That's a clinical and administrative nightmare.",
            icon: Database,
            color: "text-slate-500",
            bg: "bg-slate-50"
        },
        {
            title: "Lost Re-bookings",
            desc: "Patients who don't book their next session instantly often never return. We automate the 'Next Step'.",
            icon: RotateCcw,
            color: "text-primary",
            bg: "bg-primary/5"
        },
        {
            title: "Paperwork Clutter",
            desc: "Manually typing bills and scanning prescriptions is a 19th-century workflow. It's time to Sync.",
            icon: FileX,
            color: "text-accent",
            bg: "bg-accent/5"
        }
    ];

    return (
        <section className="py-32 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    title="The Hidden Cost of"
                    highlight="Inefficiency"
                    subtitle="Most clinics lose up to 40% of their potential revenue due to manual bottlenecks and slow response times."
                    centered
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
                    {problems.map((problem, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Card className="p-8 h-full rounded-[2.5rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-white transition-all duration-500 group" hoverEffect>
                                <div className={`w-14 h-14 ${problem.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                                    <problem.icon className={`w-6 h-6 ${problem.color}`} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-primary transition-colors">{problem.title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium">{problem.desc}</p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
