import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact GrowClinic | Strategic Growth Partnership",
  description: "Get in touch with India's healthcare growth agency. Inquire about patient acquisition systems and WhatsApp automation.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
