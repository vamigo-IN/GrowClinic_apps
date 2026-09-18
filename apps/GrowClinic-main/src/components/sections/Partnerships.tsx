import React from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { ClientMarquee } from "./ClientMarquee";
import { prisma } from "@/lib/prisma";

// The technology stack GrowClinic genuinely builds on. This is an honest
// "powered by" strip — NOT a claim of official partner status. Only add
// official badges (e.g. Google Partner, Meta Business Partner) to the
// `certifications` array once you have actually earned them, using the
// real badge artwork. Displaying unearned badges can get ads rejected.
const techStack = [
    "Google Cloud",
    "Google Ads",
    "Meta Business",
    "OpenAI",
    "Google Gemini",
    "Razorpay",
];

// Add earned certification badges here once qualified, e.g.
// { name: "Google Partner", img: "/images/badges/google-partner.png" }
const certifications: { name: string; img: string }[] = [];

export async function Partnerships() {
    // Fetch live client logos from DB; fail gracefully (never 500 the homepage)
    let clients: { name: string; logoUrl: string | null; website: string | null }[] = [];
    try {
        clients = await prisma.clientLogo.findMany({
            where: { published: true },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { name: true, logoUrl: true, website: true },
        });
    } catch (e) {
        console.error("[Partnerships] failed to load client logos:", e);
    }

    return (
        <section className="py-24 bg-slate-50 border-y border-slate-100 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Technology stack */}
                <div className="text-center">
                    <p className="text-size-tiny text-weight-bold uppercase tracking-[0.3em] text-slate-400 mb-10">
                        Built on world-class technology
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 lg:gap-x-16">
                        {techStack.map((tech) => (
                            <span
                                key={tech}
                                className="text-lg md:text-xl font-black text-slate-400 hover:text-slate-700 tracking-tight transition-colors cursor-default"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Certification badges (render only when earned) */}
                {certifications.length > 0 && (
                    <div className="mt-16 flex flex-wrap justify-center items-center gap-10">
                        {certifications.map((c) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={c.name} src={c.img} alt={c.name} className="h-16 w-auto object-contain" />
                        ))}
                    </div>
                )}

                {/* Client logos */}
                <div className="mt-24 pt-16 border-t border-slate-200">
                    <div className="flex flex-col items-center text-center mb-12">
                        <div className="w-12 h-12 rounded-[15px] bg-primary/10 flex items-center justify-center text-primary mb-5">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
                            Our Healthcare Clients
                        </h2>
                        <p className="text-slate-500 font-medium mt-3 max-w-xl">
                            Clinics, hospitals and specialists worldwide trust GrowClinic to engineer their patient
                            growth.
                        </p>
                    </div>

                    <ClientMarquee clients={clients} />

                    <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-8 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Trusted across dermatology, dental, IVF, aesthetics &amp; multispecialty care
                    </p>
                </div>
            </div>
        </section>
    );
}
