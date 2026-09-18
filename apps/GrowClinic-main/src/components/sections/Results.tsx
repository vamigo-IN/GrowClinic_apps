import React from "react";
import { SectionHeading } from "../ui/SectionHeading";
import { EmbeddedAuditForm } from "./EmbeddedAuditForm";

export function Results() {
    return (
        <section id="results" className="py-32 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <SectionHeading
                    title={<>Real Growth <br /><span className="text-gradient">Scientifically</span> Measured</>}
                    subtitle="Measurable scaling driven by medical-niche expertise and proprietary acquisition systems."
                />

                {/* The audit tool — same everywhere */}
                <div className="mt-16">
                    <EmbeddedAuditForm />
                </div>
            </div>
        </section>
    );
}
