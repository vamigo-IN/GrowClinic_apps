import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FAQ } from "@/components/sections/FAQ";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | GrowClinic Insights",
  description: "Find answers to common questions about medical marketing, clinic growth, and healthcare technology automation.",
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FAQ />
      </div>

      <Footer />
    </main>
  );
}
