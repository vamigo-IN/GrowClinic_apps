import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Strategy Session | GrowClinic",
  description: "Secure your high-level strategy session with our medical growth leads. Build your custom patient acquisition machine.",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
