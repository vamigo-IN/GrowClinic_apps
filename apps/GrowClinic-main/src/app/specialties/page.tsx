import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { specialties } from "@/lib/specialties";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Specialties We Grow | Healthcare Marketing by Specialty",
    description:
        "GrowClinic builds patient-acquisition systems tailored to each medical specialty, dermatology, dental, IVF, trichology, and cosmetology.",
    alternates: { canonical: "https://www.growclinic.io/specialties" },
};

export default function SpecialtiesIndexPage() {
    return (
        <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32" />
            <div className="max-w-7xl mx-auto relative z-10">
                <SectionHeading
                    title="Built for your"
                    highlight="specialty"
                    centered={false}
                    level="h1"
                    subtitle="Every medical specialty has its own patient psychology, economics, and buying journey. We build acquisition systems tuned to yours, not a generic agency playbook."
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
                    {specialties.map((s) => (
                        <Link
                            key={s.slug}
                            href={`/specialties/${s.slug}`}
                            className="group bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col"
                        >
                            <span className="text-size-tiny text-weight-bold uppercase tracking-[0.25em] text-primary mb-4">
                                {s.eyebrow}
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{s.name}</h2>
                            <p className="text-slate-600 font-medium leading-relaxed text-[15px] flex-1">
                                {s.subheadline}
                            </p>
                            <span className="inline-flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest mt-8 group-hover:gap-3 transition-all">
                                Explore
                                <ArrowUpRight className="w-4 h-4" />
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
