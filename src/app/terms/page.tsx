import React from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Strategic Partnership Agreement",
  description: "Terms and conditions for partnering with GrowClinic for medical practice growth and clinic engineering.",
};

export default function TermsPage() {
  return (
    <main className="pt-32 pb-20 px-4 max-w-4xl mx-auto">
      <SectionHeading title="Terms of" highlight="Service" centered={false} />
      <div className="mt-12 prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed space-y-6">
        <p>By accessing GrowClinic.io, you agree to comply with our Terms of Service.</p>
        <h2 className="text-2xl font-black text-slate-900 mt-10">1. Strategic Partnership</h2>
        <p>GrowClinic provides healthcare engineering and growth automation services. All results are based on individual practice performance and city-specific market data.</p>
        <h2 className="text-2xl font-black text-slate-900 mt-10">2. Intellectual Property</h2>
        <p>The GrowClinic name, logo, and proprietary acquisition systems are protected by intellectual property laws.</p>
        <p>Last updated: March 2026</p>
      </div>
    </main>
  );
}
