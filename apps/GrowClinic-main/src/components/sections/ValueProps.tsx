import React from "react";
import { Card } from "../ui/Card";
import { AnimatedSection } from "../ui/AnimatedSection";
import { CalendarCheck, Star, Search, BarChart3 } from "lucide-react";

export function ValueProps() {
    const props = [
        {
            title: "More Patient Bookings",
            desc: "Convert high-intent traffic into confirmed appointments.",
            icon: CalendarCheck
        },
        {
            title: "Stronger Online Reputation",
            desc: "Dominate Google reviews and build instant patient trust.",
            icon: Star
        },
        {
            title: "Higher Search Rankings",
            desc: "Be the #1 choice when patients search for specialists.",
            icon: Search
        },
        {
            title: "Maximum Marketing ROI",
            desc: "Data-driven systems that turn ad spend into high-value cases.",
            icon: BarChart3
        }
    ];

    return (
        <section className="py-32 bg-white relative -mt-20 z-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8">

                    <AnimatedSection
                        animation="fadeLeft"
                        duration={0.8}
                        className="bg-primary-gradient text-white rounded-[15px] p-10 shadow-2xl shadow-primary/30 flex flex-col justify-center min-w-[320px] relative overflow-hidden group"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <h3 className="text-4xl font-semibold leading-tight relative z-10">
                            Engineered <br /> 
                            <span className="text-white/60">For Rapid</span> <br /> 
                            Growth
                        </h3>
                        <p className="mt-6 text-white/80 font-medium relative z-10 max-w-xs">
                            We don&rsquo;t just do marketing. We build patient acquisition systems that scale clinics and hospitals.
                        </p>
                    </AnimatedSection>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 relative">
                        {props.map((prop, index) => (
                            <AnimatedSection
                                key={index}
                                animation="fadeUp"
                                delay={index * 0.1}
                            >
                                <Card className="group h-full p-8 rounded-[15px] bg-slate-50 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:bg-white transition-all duration-500 hover:-translate-y-2" hoverEffect>
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 rounded-[15px] bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                            <prop.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xl text-slate-900 leading-tight mb-2">{prop.title}</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed font-medium">{prop.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            </AnimatedSection>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}
