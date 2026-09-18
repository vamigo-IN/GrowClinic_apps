import { HeroSync } from "./components/HeroSync";
import { ProblemSync } from "./components/ProblemSync";
import { FeaturesSync } from "./components/FeaturesSync";
import { StepsSync } from "./components/StepsSync";
import { CTASync } from "./components/CTASync";
import { WhatsAppCTA } from "@/components/ui/WhatsAppCTA";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SYNC - WhatsApp Automation for Clinics | GrowClinic.io",
  description: "Let Patients Book Appointments Directly on WhatsApp. Manage appointments, patients, prescriptions, and bills, all from one simple dashboard.",
};

export default function SyncPage() {
  return (
    <main>
      <HeroSync />
      <ProblemSync />
      <FeaturesSync />
      <StepsSync />
      <CTASync />
      <WhatsAppCTA />
    </main>
  );
}
