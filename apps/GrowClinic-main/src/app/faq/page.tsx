import React from "react";
import { FAQ } from "@/components/sections/FAQ";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | GrowClinic Insights",
  description: "Find answers to common questions about medical marketing, clinic growth, and healthcare technology automation.",
};

// Note: <Navbar /> and <Footer /> are provided globally by SiteChrome — do not
// render them here or the page ends up with duplicate chrome. The FAQ section
// also emits its own FAQPage JSON-LD, so no extra structured data is needed here.
export default function FAQPage() {
  return <FAQ />;
}
