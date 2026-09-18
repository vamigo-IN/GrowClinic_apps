import React from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { Repeat, TrendingUp, HeartHandshake, Calendar } from "lucide-react";

// ⚠️ Replace these with your REAL, verifiable figures before publishing.
// The audit specifically flags fabricated proof as a credibility risk —
// only publish numbers you can stand behind.
const retentionStats = [
    { value: "Long-term", label: "Partnerships, not one-off projects", icon: Repeat },
    { value: "Month-on-month", label: "Compounding growth per client", icon: TrendingUp },
    { value: "Dedicated", label: "Strategist on every account", icon: HeartHandshake },
];

const timeline = [
    {
        when: "Month 1",
        title: "Foundation",
        desc: "We audit, fix the leaks, and launch the first acquisition campaigns. Quick wins build trust.",
    },
    {
        when: "Months 2 to 6",
        title: "Momentum",
        desc: "Funnels are optimised, follow-up is automated, and a predictable patient pipeline takes shape.",
    },
    {
        when: "Months 6 to 12",
        title: "Scale",
        desc: "We expand into new treatments, channels and locations as cost-per-patient drops and volume rises.",
    },
    {
        when: "Year 2+",
        title: "Partnership",
        desc: "GrowClinic becomes your embedded growth team, protecting market share and compounding results.",
    },
];

export function RetentionSection() {
    return (
        <section className="py-32 bg-white relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -ml-64 -mb-32" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <SectionHeading
                    title={
                        <>
                            Clients don&rsquo;t leave.
                            <br />
                            They <span className="text-gradient">scale</span>.
                        </>
                    }
                    subtitle="The truest measure of an agency isn't how many clinics it signs, it's how many stay. We build partnerships designed to compound, year after year."
                    centered={false}
                />

                <div className="grid lg:grid-cols-12 gap-12 items-start mt-16">
                    {/* Stats */}
                    <div className="lg:col-span-5 space-y-6">
                        {retentionStats.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-6 bg-slate-50 p-8 rounded-[15px] border border-slate-100"
                            >
                                <div className="w-14 h-14 rounded-[15px] bg-primary-gradient flex items-center justify-center text-white shadow-glow shrink-0">
                                    <s.icon className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</div>
                                    <div className="text-sm font-bold text-slate-500">{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Timeline */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-[15px] p-8 lg:p-12 border border-slate-100 shadow-2xl">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <p className="text-size-tiny text-weight-bold uppercase tracking-[0.25em] text-slate-400">
                                    The GrowClinic Partnership Curve
                                </p>
                            </div>

                            <div className="space-y-8">
                                {timeline.map((t, i) => (
                                    <div key={i} className="flex gap-6">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                                            {i < timeline.length - 1 && (
                                                <div className="w-px flex-1 bg-slate-100 my-2" />
                                            )}
                                        </div>
                                        <div className="pb-2">
                                            <div className="text-size-tiny text-weight-bold uppercase tracking-widest text-primary mb-1">
                                                {t.when}
                                            </div>
                                            <h3 className="font-black text-lg text-slate-900 mb-1">{t.title}</h3>
                                            <p className="text-slate-600 font-medium leading-relaxed text-[15px]">
                                                {t.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
