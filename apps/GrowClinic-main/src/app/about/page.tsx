import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { team } from "@/lib/team";
import { COMPANY } from "@/lib/legal";
import {
    Stethoscope,
    Target,
    Gauge,
    ShieldCheck,
    HeartPulse,
    LineChart,
    Sparkles,
    Linkedin,
    Activity,
    Users,
    TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
    title: "About GrowClinic | Healthcare Growth Agency",
    description:
        "GrowClinic is a healthcare-only growth agency, part of Cloutrr Grow Pvt Ltd. We engineer patient-acquisition systems for clinics and doctors worldwide.",
    alternates: { canonical: "https://www.growclinic.io/about" },
    openGraph: {
        title: "About GrowClinic | Healthcare Growth Agency",
        description:
            "A healthcare-only growth agency engineering patient-acquisition systems for clinics and doctors worldwide.",
        url: "https://www.growclinic.io/about",
    },
};

const stats = [
    { end: 50, suffix: "+", label: "Clinics scaled", icon: Activity },
    { end: 10000, suffix: "+", label: "Patient leads / month", icon: Users },
    { end: 3.7, suffix: "x", decimals: 1, label: "Average account ROI", icon: TrendingUp },
];

const differentiators = [
    {
        icon: Stethoscope,
        title: "Healthcare only",
        desc: "We do not work with every industry. We work with clinics, hospitals and doctors, so every system we build is shaped by how patients actually choose and book care.",
    },
    {
        icon: LineChart,
        title: "Systems, not one-off tactics",
        desc: "We build a complete acquisition engine, from search visibility to instant follow-up, rather than running disconnected campaigns that stop working when you stop paying.",
    },
    {
        icon: Gauge,
        title: "Obsessed with ROI",
        desc: "Every campaign is measured against cost-per-patient, not vanity clicks. We lead with numbers because that is what protects your investment.",
    },
    {
        icon: HeartPulse,
        title: "Speed where it matters",
        desc: "Our Sync automation answers enquiries in seconds, because the clinic that responds first usually wins the patient.",
    },
];

const values = [
    {
        icon: ShieldCheck,
        title: "Honesty over hype",
        desc: "We would rather show you a real number than an inflated promise. Trust is the only foundation worth building a practice on.",
    },
    {
        icon: Target,
        title: "Outcomes, not activity",
        desc: "We measure ourselves by the patients you gain, not the reports we send.",
    },
    {
        icon: Sparkles,
        title: "Build to last",
        desc: "We design partnerships that compound year after year, not quick wins that fade.",
    },
];

function initials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export default function AboutPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.growclinic.io" },
            { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.growclinic.io/about" },
        ],
    };

    return (
        <main className="bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950 pt-36 pb-24">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[420px] bg-primary/30 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.06] bg-[url('/grid-pattern.svg')] pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-8 text-white/80 text-size-tiny text-weight-bold uppercase tracking-[0.2em]">
                        <Sparkles className="w-3 h-3 text-primary" />
                        About GrowClinic
                    </span>
                    <h1 className="heading-style-h1 text-white">
                        We help good doctors get the{" "}
                        <span className="text-gradient">patients they deserve</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 font-medium mt-6 max-w-2xl mx-auto leading-relaxed">
                        GrowClinic is a healthcare-only growth agency. We build the patient-acquisition systems
                        that turn online searches into booked appointments for clinics and doctors worldwide.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug tracking-tight">
                        Great clinical care should never lose to better marketing. Our mission is to make sure the
                        best doctors are also the easiest to find, trust, and book.
                    </p>
                </div>
            </section>

            {/* Story */}
            <section className="py-20 bg-slate-50 border-y border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="w-10 h-1.5 bg-primary rounded-full" />
                        <span className="w-3 h-1.5 bg-accent rounded-full" />
                    </div>
                    <h2 className="heading-style-h2 text-slate-900 mb-8">Our story</h2>
                    <div className="space-y-5 text-lg text-slate-600 font-medium leading-relaxed">
                        <p>
                            GrowClinic was built on a simple observation: the doctor with the best outcomes is not
                            always the one with the fullest waiting room. Patients increasingly choose care the way
                            they choose everything else, by searching online, reading reviews, and booking the clinic
                            that earns their trust first.
                        </p>
                        <p>
                            Most agencies treat healthcare like any other industry. We do the opposite. Everything we
                            build, from search strategy to WhatsApp follow-up, is shaped specifically around how
                            patients decide and how clinics actually run.
                        </p>
                        <p>
                            GrowClinic is a part of <strong>{COMPANY.legalName}</strong>, and operates from Sector 119, Noida,
                            serving clinics, hospitals and specialists across India and around the world.
                        </p>
                    </div>
                </div>
            </section>

            {/* Differentiators */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 text-center mb-4">
                        What makes us different
                    </h2>
                    <p className="text-lg text-slate-600 font-medium text-center max-w-2xl mx-auto mb-16">
                        Specialised, systems-driven, and accountable to one number that matters: patients gained.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {differentiators.map((d) => (
                            <div
                                key={d.title}
                                className="flex gap-5 bg-slate-50 p-8 rounded-[15px] border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                            >
                                <div className="shrink-0 w-14 h-14 rounded-[15px] bg-primary-gradient flex items-center justify-center text-white shadow-glow">
                                    <d.icon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 mb-2">{d.title}</h3>
                                    <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{d.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
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

            {/* Values */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="heading-style-h2 text-slate-900 text-center mb-16">
                        What we believe
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {values.map((v) => (
                            <div key={v.title} className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm text-center">
                                <div className="w-14 h-14 mx-auto rounded-[15px] bg-primary/10 flex items-center justify-center text-primary mb-6">
                                    <v.icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-3">{v.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed text-[15px]">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team (renders only when real members are added in src/lib/team.ts) */}
            {team.length > 0 && (
                <section className="py-24 bg-slate-50 border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="heading-style-h2 text-slate-900 text-center mb-16">
                            The people behind GrowClinic
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {team.map((m) => (
                                <div key={m.name} className="bg-white p-8 rounded-[15px] border border-slate-100 shadow-sm text-center">
                                    {m.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.image} alt={m.name} className="w-24 h-24 mx-auto rounded-full object-cover mb-5" />
                                    ) : (
                                        <div className="w-24 h-24 mx-auto rounded-full bg-primary-gradient text-white flex items-center justify-center text-2xl font-black mb-5">
                                            {initials(m.name)}
                                        </div>
                                    )}
                                    <h3 className="font-black text-lg text-slate-900">{m.name}</h3>
                                    <p className="text-primary font-bold text-sm uppercase tracking-widest mb-3">{m.role}</p>
                                    {m.bio && <p className="text-slate-600 font-medium text-sm leading-relaxed">{m.bio}</p>}
                                    {m.linkedin && (
                                        <a
                                            href={m.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`${m.name} on LinkedIn`}
                                            className="inline-flex mt-4 text-slate-400 hover:text-primary transition-colors"
                                        >
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-12 md:p-16 rounded-[15px] bg-slate-900 text-white relative overflow-hidden shadow-2xl text-center">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
                        <div className="relative space-y-6">
                            <h2 className="heading-style-h2">Let&rsquo;s grow your practice</h2>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                                See exactly where your clinic is leaking patients, with a growth audit. No
                                obligation, just a clear picture.
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
