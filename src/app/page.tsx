export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Hero } from "@/components/sections/Hero";
import { TrustSection } from "@/components/sections/TrustSection";
import { ValueProps } from "@/components/sections/ValueProps";
import { Services } from "@/components/sections/Services";
import { PatientSystem } from "@/components/sections/PatientSystem";
import { FeaturedTestimonials } from "@/components/sections/FeaturedTestimonials";
import { Results } from "@/components/sections/Results";
import { AuditSection } from "@/components/sections/AuditSection";
import { BookingSection } from "@/components/sections/BookingSection";
import { ProjectsPreview } from "@/components/sections/ProjectsPreview";
import { WhatsAppCTA } from "@/components/ui/WhatsAppCTA";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrowClinic | India's Elite Healthcare Growth Agency",
  description: "Scale your medical practice with GrowClinic. We engineer patient acquisition systems for elite doctors and clinics. Join 100+ medical leaders today.",
};

export default async function Home() {
  // @ts-ignore - Prisma property might be stale in editor
  const testimonials = await prisma.testimonial.findMany({
    where: { featured: true, published: true },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Hero />
      <TrustSection />
      <ValueProps />
      <ProjectsPreview />
      <Services />
      <PatientSystem />
      <Results />
      <AuditSection />
      <FeaturedTestimonials testimonials={testimonials} />
      <BookingSection />
      <WhatsAppCTA />
    </>
  );
}
