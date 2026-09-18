import React from "react";
import Link from "next/link";
import { SectionHeading } from "../ui/SectionHeading";
import { AnimatedSection } from "../ui/AnimatedSection";
import { specialties } from "@/lib/specialties";
import { Sparkles, Smile, Baby, Scissors, Gem, Building2, ArrowUpRight, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
    dermatology: Sparkles,
    dental: Smile,
    ivf: Baby,
    trichology: Scissors,
    cosmetology: Gem,
    hospital: Building2,
};

export function TrustSection() {
    return (
        <section className="py-32 bg-slate-50 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] bg-[url('/grid-pattern.svg')] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <SectionHeading
                    title={
                        <>
                            Built for your <span className="text-gradient">speciality</span>
                        </>
                    }
                    subtitle="Every speciality has its own patients, economics, and buying journey. We build growth systems tuned to yours."
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 mt-16">
                    {specialties.map((s, index) => {
                        const Icon = ICONS[s.slug] ?? Sparkles;
                        return (
                            <AnimatedSection
                                key={s.slug}
                                animation="fadeUp"
                                delay={index * 0.08}
                            >
                                <Link
                                    href={`/specialties/${s.slug}`}
                                    className="group block h-full bg-white rounded-[15px] p-7 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500"
                                >
                                    <div className="w-14 h-14 rounded-[15px] bg-slate-50 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-900 mb-1 tracking-tight">{s.name}</h3>
                                    <span className="inline-flex items-center gap-1 text-size-tiny text-weight-bold uppercase tracking-widest text-slate-400 group-hover:text-primary group-hover:gap-2 transition-all">
                                        Explore
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </span>
                                </Link>
                            </AnimatedSection>
                        );
                    })}
                </div>

                {/* Authority strip */}
                <AnimatedSection
                    animation="fadeUp"
                    delay={0.3}
                    duration={0.8}
                    className="mt-28 pt-16 border-t border-slate-200"
                >
                    <p className="text-center text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-12">
                        Powering growth for specialised medical practices
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-8 lg:gap-x-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                        {["Surgery", "Dental", "Dermatology", "IVF", "Pediatrics", "Cardiology"].map((spec) => (
                            <div
                                key={spec}
                                className="text-lg md:text-xl font-black text-slate-900 hover:text-primary transition-colors cursor-default tracking-tighter"
                            >
                                {spec}
                            </div>
                        ))}
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}
