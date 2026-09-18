import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact GrowClinic",
  description: "Get in touch with the GrowClinic team.",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
