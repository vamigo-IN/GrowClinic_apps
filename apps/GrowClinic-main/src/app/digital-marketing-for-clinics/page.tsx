import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { specialties } from "@/lib/specialties";
import {
    Globe,
    MapPin,
    Search,
    Megaphone,
    Instagram,
    FileText,
    Star,
    MessageCircle,
    BarChart3,
    CheckCircle2,
    ArrowUpRight,
    Sparkles,
    Activity,
    Users,
    TrendingUp,
    Stethoscope,
} from "lucide-react";

const TITLE = "Digital Marketing for Clinics & Doctors | GrowClinic";
const DESC =
    "Digital marketing for clinics and doctors that turns online searches into booked patients. Clinic websites, local SEO, Google & Meta ads, reviews and WhatsApp automation, all in one system.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: "https://www.growclinic.io/digital-marketing-for-clinics" },
    openGraph: {
        title: TITLE,
        description: DESC,
        url: "https://www.growclinic.io/digital-marketing-for-clinics",
    },
    twitter: { title: TITLE, description: DESC },
};

const services = [
    {
        icon: Globe,
        title: "Clinic Website",
        desc: "A fast, mobile-first website that builds trust and makes booking effortless.",
    },
    {
        icon: MapPin,
        title: "Local SEO & Google Business",
        desc: "Show up in Google Maps and local search when patients look for you nearby.",
    },
    {
        icon: Search,
        title: "Healthcare SEO",
        desc: "Rank for the treatments and conditions your patients actually search for.",
    },
    {
        icon: Megaphone,
        title: "Google Ads",
        desc: "Compliant, high-intent campaigns that bring in patients ready to book.",
    },
    {
        icon: Instagram,
        title: "Meta & Instagram Ads",
        desc: "Reach the right local audience and build a premium clinic brand.",
    },
    {
        icon: FileText,
        title: "Content & Blogs",
        desc: "Simple, trustworthy content that answers patient questions and ranks.",
    },
    {
        icon: Star,
        title: "Reviews & Reputation",
        desc: "More 5-star Google reviews, managed so your clinic looks the obvious choice.",
    },
    {
        icon: MessageCircle,
        title: "WhatsApp Automation",
        desc: "Our Sync tool replies to every enquiry in seconds and cuts no-shows.",
    },
    {
        icon: BarChart3,
        title: "Tracking & Reporting",
        desc: "See every lead, call and rupee. Clear reports, measured on cost per patient.",
    },
];

const steps = [
    {
        n: "1",
        title: "Clinic growth audit",
        desc: "We find exactly where you are losing patients online, in about 150 seconds.",
    },
    {
        n: "2",
        title: "Fix the leaks",
        desc: "We fix your website, Google profile and follow-up so nothing slips through.",
    },
    {
        n: "3",
        title: "Drive demand",
        desc: "SEO and ads bring a steady flow of high-intent patients to your clinic.",
    },
    {
        n: "4",
        title: "Measure & scale",
        desc: "We track cost per patient and scale what works, month after month.",
    },
];

const stats = [
    { end: 50, suffix: "+", label: "Clinics scaled", icon: Activity },
    { end: 10000, suffix: "+", label: "Patient leads / month", icon: Users },
    { end: 3.7, suffix: "x", decimals: 1, label: "Average account ROI", icon: TrendingUp },
];

const faqs = [
    {
        q: "What is digital marketing for clinics?",
        a: "It is the full system that helps a clinic get found and chosen online: a strong website, local SEO and Google Business Profile, Google and Meta ads, reviews, content, and fast patient follow-up. Done together, these turn online searches into booked appointments.",
    },
    {
        q: "How much does digital marketing for a clinic cost?",
        a: "It depends on your goals, city and the treatments you want to grow. We start with an audit, then recommend a plan with clear pricing. Every rupee is measured against cost per patient, so you always know your return.",
    },
    {
        q: "Can doctors run Google and Meta ads?",
        a: "Yes, within each platform's healthcare policies. We build compliant campaigns that promote your clinic and treatments the right way, so your ads get approved and your account stays safe.",
    },
    {
        q: "How long until we see results?",
        a: "Paid ads can bring enquiries within the first few weeks. SEO and reviews compound over a few months. We focus on profitable, qualified patients rather than vanity numbers.",
    },
    {
        q: "Do you only work with clinics and doctors?",
        a: "Yes. GrowClinic is healthcare-only. We work with clinics, hospitals and doctors across India and worldwide, so everything we build is shaped around how patients choose care.",
    },
];

export default function DigitalMarketingForClinicsPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "name": "Digital Marketing for Clinics",
                "serviceType": "Healthcare digital marketing",
                "provider": { "@type": "Organization", "name": "GrowClinic", "@id": "https://www.growclinic.io/#organization" },
                "areaServed": { "@type": "Place", "name": "Worldwide" },
                "url": "https://www.growclinic.io/digital-marketing-for-clinics",
                "description": DESC,
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.growclinic.io" },
                    { "@type": "ListItem", "position": 2, "name": "Digital Marketing for Clinics", "item": "https://www.growclinic.io/digital-marketing-for-clinics" },
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": faqs.map((f) => ({
                    "@type": "Question",
                    "name": f.q,
                    "acceptedAnswer": { "@type": "Answer", "text": f.a },
                })),
            },
        ],
    };

    return (
        <main className="bg-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950 pt-36 pb-24">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[420px] bg-primary/30 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-15%] left-[5%] w-[360px] h-[360px] bg-accent/20 blur-[130px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.06] bg-[url('/grid-pattern.svg')] pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-8 text-white/80 text-size-tiny text-weight-bold uppercase tracking-[0.2em]">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Digital Marketing for Clinics
                    </span>
                    <h1 className="heading-style-h1 text-white">
                        Digital marketing for clinics that{" "}
                        <span className="text-gradient">fills your appointment book</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 font-medium mt-6 max-w-2xl mx-auto leading-relaxed">
                        We help clinics and doctors get found on Google, win patient trust, and turn searches into
                        booked appointments. One simple system, built for healthcare.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center mt-10">
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
                                className="px-10 border-white/20 text-white hover:bg-white/10"
                            >
                                Talk to Us
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Problem */}
            <section className="py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug tracking-tight">
                        Today, patients choose a clinic the way they choose everything else. They search, read
                        reviews, and book whoever they trust first. If your clinic is hard to find, you lose that
                        patient to the clinic that is not.
                    </p>
                </div>
            </section>

            {/* Services */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 text-center mb-4">
                        Everything your clinic needs to grow
                    </h2>
                    <p className="text-lg text-slate-600 font-medium text-center max-w-2xl mx-auto mb-16">
                        One team, one system. No juggling five different agencies.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((s) => (
                            <div
                                key={s.title}
                                className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                            >
                                <div className="w-14 h-14 rounded-[15px] bg-primary/10 flex items-center justify-center text-primary mb-6">
                                    <s.icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-2">{s.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 text-center mb-16">
                        How it works
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {steps.map((s) => (
                            <div key={s.n} className="bg-slate-50 p-8 rounded-[15px] border border-slate-100">
                                <div className="w-12 h-12 rounded-[15px] bg-primary-gradient flex items-center justify-center text-white font-black shadow-glow mb-6">
                                    {s.n}
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-2">{s.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why healthcare-only */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-[15px] bg-primary/10 flex items-center justify-center text-primary mb-6">
                        <Stethoscope className="w-7 h-7" />
                    </div>
                    <h2 className="heading-style-h2 text-slate-900 mb-5">
                        Built only for healthcare
                    </h2>
                    <p className="text-lg text-slate-600 font-medium leading-relaxed">
                        We are not a generalist agency that also takes clinics. Healthcare is all we do. That means
                        we understand patient trust, medical advertising rules, and how people really choose a
                        doctor, so your marketing is effective and compliant from day one.
                    </p>
                </div>
            </section>

            {/* Stats */}
            <section className="py-16 bg-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid sm:grid-cols-3 gap-8 text-center">
                        {stats.map((s, i) => (
                            <div key={i}>
                                <s.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                                <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                                    <CountUp end={s.end} suffix={s.suffix} decimals={s.decimals ?? 0} />
                                </div>
                                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Specialties */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 text-center mb-4">
                        Marketing tuned to your speciality
                    </h2>
                    <p className="text-lg text-slate-600 font-medium text-center max-w-2xl mx-auto mb-12">
                        Every speciality has its own patients and economics. Pick yours.
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {specialties.map((s) => (
                            <Link
                                key={s.slug}
                                href={`/specialties/${s.slug}`}
                                className="group bg-slate-50 rounded-[15px] p-6 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-500 text-center"
                            >
                                <span className="font-black text-slate-900">{s.name}</span>
                                <span className="mt-2 inline-flex items-center gap-1 text-size-tiny text-weight-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                                    View <ArrowUpRight className="w-3 h-3" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 mb-12 text-center">
                        Questions clinics ask
                    </h2>
                    <div className="space-y-5">
                        {faqs.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm">
                                <h3 className="font-black text-lg text-slate-900 mb-3 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
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
                                Ready for more patients?
                            </h2>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                                Start with an audit of your clinic&rsquo;s online growth. See where the patients
                                are leaking, then let us fix it.
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
                                        Talk to Us
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
