import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { getSpecialty, specialties } from "@/lib/specialties";
import { ArrowLeft, AlertCircle, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export function generateStaticParams() {
    return specialties.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const specialty = getSpecialty(slug);
    if (!specialty) return { title: "Specialty Not Found" };

    return {
        title: specialty.metaTitle,
        description: specialty.metaDescription,
        alternates: { canonical: `https://www.growclinic.io/specialties/${specialty.slug}` },
        openGraph: {
            title: specialty.metaTitle,
            description: specialty.metaDescription,
            url: `https://www.growclinic.io/specialties/${specialty.slug}`,
        },
    };
}

export default async function SpecialtyPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const specialty = getSpecialty(slug);
    if (!specialty) notFound();

    // Natural-language noun phrases for the sentence-style headings — preserves
    // acronyms (IVF) and avoids odd wording (a hospital isn't a "clinic").
    const PRACTICE_LABELS: Record<string, { plural: string; singular: string }> = {
        dermatology: { plural: "dermatology clinics", singular: "dermatology practice" },
        dental: { plural: "dental practices", singular: "dental practice" },
        ivf: { plural: "IVF & fertility clinics", singular: "IVF & fertility practice" },
        trichology: { plural: "trichology & hair clinics", singular: "trichology practice" },
        cosmetology: { plural: "cosmetology & aesthetics clinics", singular: "aesthetics practice" },
        hospital: { plural: "multispeciality hospitals", singular: "hospital" },
    };
    const labels = PRACTICE_LABELS[specialty.slug] ?? {
        plural: `${specialty.name.toLowerCase()} clinics`,
        singular: `${specialty.name.toLowerCase()} practice`,
    };

    const pageUrl = `https://www.growclinic.io/specialties/${specialty.slug}`;
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "name": `${specialty.name} Marketing & Patient Acquisition`,
                "serviceType": `${specialty.name} healthcare marketing`,
                "provider": { "@type": "Organization", "name": "GrowClinic", "@id": "https://www.growclinic.io/#organization" },
                "areaServed": { "@type": "Country", "name": "India" },
                "url": pageUrl,
                "description": specialty.metaDescription,
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.growclinic.io" },
                    { "@type": "ListItem", "position": 2, "name": "Specialties", "item": "https://www.growclinic.io/specialties" },
                    { "@type": "ListItem", "position": 3, "name": specialty.name, "item": pageUrl },
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": specialty.faqs.map((f) => ({
                    "@type": "Question",
                    "name": f.q,
                    "acceptedAnswer": { "@type": "Answer", "text": f.a },
                })),
            },
        ],
    };

    return (
        <main className="bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {/* Hero */}
            <section className="pt-32 pb-20 bg-mesh-gradient border-b border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <Link
                        href="/specialties"
                        className="inline-flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase hover:opacity-70 transition-opacity mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        All Specialties
                    </Link>

                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-size-tiny text-weight-bold uppercase tracking-[0.25em] text-primary bg-primary/5 border border-primary/10 rounded-full px-4 py-1.5">
                            {specialty.eyebrow}
                        </span>
                    </div>

                    <h1 className="heading-style-h1 text-slate-900 max-w-4xl">
                        {specialty.headline}
                    </h1>
                    <p className="text-xl text-slate-600 font-medium mt-6 max-w-3xl leading-relaxed">
                        {specialty.subheadline}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-10">
                        <Button
                            variant="primary"
                            size="lg"
                            href="https://audit.growclinic.io"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Audit Your Clinic
                        </Button>
                        <Button variant="outline" size="lg" href="/contact">
                            Contact Us
                        </Button>
                    </div>
                </div>
            </section>

            {/* Intro */}
            <section className="py-20">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug tracking-tight">
                        {specialty.intro}
                    </p>
                </div>
            </section>

            {/* Pain points */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-10 h-1.5 bg-accent rounded-full" />
                        <span className="w-3 h-1.5 bg-primary rounded-full" />
                    </div>
                    <h2 className="heading-style-h2 text-slate-900 mb-14">
                        Why {labels.plural} struggle to grow
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {specialty.painPoints.map((p, i) => (
                            <div
                                key={i}
                                className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm"
                            >
                                <div className="w-12 h-12 rounded-[15px] bg-accent/10 flex items-center justify-center text-accent mb-6">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-3">{p.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Approach */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-10 h-1.5 bg-primary rounded-full" />
                        <span className="w-3 h-1.5 bg-accent rounded-full" />
                    </div>
                    <h2 className="heading-style-h2 text-slate-900 mb-4">
                        How we grow {labels.plural}
                    </h2>
                    <p className="text-lg text-slate-600 font-medium max-w-2xl mb-14">
                        A complete, measurable system, not isolated tactics.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                        {specialty.approach.map((a, i) => (
                            <div
                                key={i}
                                className="flex gap-5 bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                            >
                                <div className="shrink-0 w-12 h-12 rounded-[15px] bg-primary-gradient flex items-center justify-center text-white font-black shadow-glow">
                                    {i + 1}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 mb-2">{a.title}</h3>
                                    <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{a.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats band */}
            <section className="py-16 bg-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        {specialty.stats.map((s, i) => (
                            <div key={i}>
                                <div className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight">
                                    {s.metric}
                                </div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 mb-12">
                        What&rsquo;s included
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {specialty.services.map((svc, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 bg-slate-50 px-6 py-5 rounded-[15px] border border-slate-100"
                            >
                                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                                <span className="font-bold text-slate-800">{svc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 mb-12">
                        Frequently asked
                    </h2>
                    <div className="space-y-5">
                        {specialty.faqs.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm">
                                <h3 className="font-black text-lg text-slate-900 mb-3 flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-1" />
                                    {f.q}
                                </h3>
                                <p className="text-slate-600 font-medium leading-relaxed pl-8">{f.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-12 md:p-16 rounded-[15px] bg-slate-900 text-white relative overflow-hidden shadow-2xl text-center">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
                        <div className="relative space-y-6">
                            <h2 className="heading-style-h2">
                                Ready to scale your {labels.singular}?
                            </h2>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                                Get an audit of your clinic&rsquo;s growth potential, no obligation, just a clear
                                picture of where your patients are leaking.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center pt-4">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="px-10"
                                    href="https://audit.growclinic.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Audit Your Clinic
                                </Button>
                                <Link href="/contact">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="px-10 bg-white/10 border-white/20 text-white hover:bg-white hover:text-slate-900"
                                    >
                                        Contact Us
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
