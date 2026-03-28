"use client";

import React from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "../ui/SectionHeading";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Search, Megaphone, Monitor, Users, ThumbsUp, MessageSquare, ArrowUpRight } from "lucide-react";

export function Services() {
    const services = [
        {
            title: "Performance SEO",
            desc: "Dominate local medical searches and be the first clinic patients find when they need help.",
            icon: Search
        },
        {
            title: "Paid Acquisition (PPC)",
            desc: "Precision-targeted campaigns on Google & Meta that generate immediate, high-intent patient inquiries.",
            icon: Megaphone
        },
        {
            title: "Conversion-Centric Web",
            desc: "High-speed, HIPAA-ready websites designed to convert visitors into booked appointments.",
            icon: Monitor
        },
        {
            title: "Social Authority",
            desc: "Building clinic reputation through high-value healthcare content and community engagement.",
            icon: Users
        },
        {
            title: "Reputation Engineering",
            desc: "Automated systems to capture 5-star reviews and solidify your position as a city leader.",
            icon: ThumbsUp
        },
        {
            title: "Patient Retention (CRM)",
            desc: "WhatsApp & Email automation that reduces no-shows and increases patient lifetime value.",
            icon: MessageSquare
        }
    ];

    return (
        <section id="services" className="py-32 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <SectionHeading
                    title={<>Growth Solutions For <br /><span className="text-gradient italic">Elite</span> Practices</>}
                    subtitle="Our medical marketing stack is designed exclusively for dentists, doctors, and multi-specialty hospitals."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Card className="group h-full p-1 w-full bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 overflow-hidden" hoverEffect>
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <service.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-primary transition-colors">{service.title}</h3>
                                    <p className="text-slate-600 mb-8 font-medium leading-relaxed">{service.desc}</p>

                                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-primary/10 transition-colors">
                                        <span className="text-sm font-bold text-slate-400 group-hover:text-primary transition-colors uppercase tracking-widest">Scalable Result</span>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mt-20 text-center"
                >
                    <Button variant="primary" className="text-xl px-12 py-5 shadow-glow rounded-[2rem]" onClick={() => window.location.href = '/contact'}>
                        Consult Our Strategy Team
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
