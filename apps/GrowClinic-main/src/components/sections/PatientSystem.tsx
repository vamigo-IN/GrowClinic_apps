import React from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { AnimatedSection } from "../ui/AnimatedSection";
import { Search, Globe, Zap, MessageCircle, BarChart2 } from "lucide-react";

const steps = [
    {
        title: "Market Intelligence",
        desc: "Deep analysis of your city's competitors and patient search behavior.",
        icon: Search
    },
    {
        title: "Conversion Engine",
        desc: "High-converting, mobile-first landing pages built for medical trust.",
        icon: Globe
    },
    {
        title: "Precision Targeting",
        desc: "Expertly managed Google & Meta Ads targeting high-value medical cases.",
        icon: Zap
    },
    {
        title: "Direct Response",
        desc: "WhatsApp automation that captures leads and reduces no-shows instantly.",
        icon: MessageCircle
    },
    {
        title: "ROI Optimization",
        desc: "Real-time tracking of every rupee to minimize patient acquisition cost.",
        icon: BarChart2
    }
];

export function PatientSystem() {
    return (
        <section className="py-32 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading 
                    title={<>Proven <span className="text-gradient">Acquisition</span> Framework</>}
                    subtitle="A scientific, 5-step engine designed to scale specialized clinics predictably and profitably."
                />

                <div className="mt-24 relative">
                    {/* Connection Line for Desktop */}
                    <div className="hidden lg:block absolute top-[2.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-16 relative z-10">
                        {steps.map((step, index) => (
                            <AnimatedSection 
                                key={index}
                                animation="scaleIn"
                                delay={index * 0.1}
                                duration={0.6}
                                className="flex flex-col items-center text-center group"
                            >
                                <div className="w-20 h-20 rounded-[15px] bg-slate-50 border border-slate-100 flex items-center justify-center shadow-xl shadow-slate-200/50 mb-8 relative group-hover:bg-primary group-hover:text-white transition-all duration-500 hover:-translate-y-2">
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-black text-primary border border-slate-50 z-20">
                                        0{index + 1}
                                    </div>
                                    <step.icon className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-primary transition-colors">{step.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed font-medium px-4">{step.desc}</p>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
