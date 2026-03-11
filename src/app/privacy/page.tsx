import React from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Charter | GrowClinic Data Security",
  description: "Learn how GrowClinic protects your practice data and follows HIPAA-compliant standards for secure healthcare growth.",
};

export default function PrivacyPage() {
  return (
    <main className="pt-32 pb-20 px-4 max-w-4xl mx-auto">
      <SectionHeading title="Privacy" highlight="Policy" centered={false} />
      <div className="mt-12 prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed space-y-6">
        <p>Your privacy is of extreme importance to GrowClinic. This document outlines how we collect and protect your data.</p>
        <h2 className="text-2xl font-black text-slate-900 mt-10">1. Data Collection</h2>
        <p>We collect information you provide directly to us through audit forms, booking sessions, and contact inquiries.</p>
        <h2 className="text-2xl font-black text-slate-900 mt-10">2. Data Security</h2>
        <p>GrowClinic employs enterprise-grade encryption and HIPAA-compliant standards to ensure your practice data and patient information remain secure.</p>
        <p>Last updated: March 2026</p>
      </div>
    </main>
  );
}
