export const revalidate = 60;
import { prisma } from "@/lib/prisma";
import { Hero } from "@/components/sections/Hero";
import { TrustSection } from "@/components/sections/TrustSection";
import { ValueProps } from "@/components/sections/ValueProps";
import { Services } from "@/components/sections/Services";
import { PatientSystem } from "@/components/sections/PatientSystem";
import { FeaturedTestimonials } from "@/components/sections/FeaturedTestimonials";
import { Results } from "@/components/sections/Results";
import { Partnerships } from "@/components/sections/Partnerships";
import { FAQ } from "@/components/sections/FAQ";
import { CaseStudiesPreview } from "@/components/sections/CaseStudiesPreview";
import { WhatsAppCTA } from "@/components/ui/WhatsAppCTA";
import { Metadata } from "next";

const HOME_TITLE = "Healthcare Marketing for Clinics & Doctors | GrowClinic";
const HOME_DESC =
  "Scale your medical practice with GrowClinic. We engineer patient acquisition systems for clinics and doctors worldwide. Join 50+ clinics growing every day.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESC,
  alternates: { canonical: "https://www.growclinic.io" },
  openGraph: { title: HOME_TITLE, description: HOME_DESC, url: "https://www.growclinic.io" },
  twitter: { title: HOME_TITLE, description: HOME_DESC },
};

export default async function Home() {
  // Build-/runtime-safe: the homepage is the platform health-check route, so it
  // must never 5xx even if the database is briefly unreachable (otherwise the
  // app gets killed and restarted in a 503 loop).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testimonials: any[] = [];
  try {
    testimonials = await prisma.testimonial.findMany({
      where: { featured: true, published: true },
      take: 3,
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Home testimonials query failed:", e);
    testimonials = [];
  }

  return (
    <>
      <Hero />
      <TrustSection />
      <ValueProps />
      <CaseStudiesPreview />
      <Services />
      <PatientSystem />
      <Results />
      <FeaturedTestimonials testimonials={testimonials} />
      <Partnerships />
      <FAQ />
      <WhatsAppCTA />
    </>
  );
}
