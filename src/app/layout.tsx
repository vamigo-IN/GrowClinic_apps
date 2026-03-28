import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

import { prisma } from "@/lib/prisma";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  // ... existing metadata ...
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "GrowClinic | India's Elite Healthcare Growth Agency",
    template: "%s | GrowClinic"
  },
  description: "Scale your medical practice with GrowClinic. India's #1 healthcare engineering agency specializing in automated patient acquisition and clinic growth.",
  keywords: ["healthcare marketing", "clinic growth", "patient acquisition", "medical digital marketing", "healthcare automation"],
  authors: [{ name: "GrowClinic Team" }],
  creator: "GrowClinic",
  publisher: "GrowClinic (OPC) Pvt Ltd",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://growclinic.io",
    siteName: "GrowClinic",
    title: "GrowClinic | Engineering Growth for Elite Medical Practices",
    description: "Scale your practice with India's most advanced patient acquisition machine.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GrowClinic - Medical Growth Agency",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowClinic | Medical Growth Systems",
    description: "Engineering growth for India's elite clinics and doctors.",
    images: ["/images/og-image.jpg"],
    creator: "@growclinic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "global" }
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GrowClinic",
    "url": "https://growclinic.io",
    "logo": "https://growclinic.io/favicon.ico",
    "description": "India's elite healthcare growth agency specialized in patient acquisition and clinic engineering.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Noida",
      "addressRegion": "Uttar Pradesh",
      "addressCountry": "IN"
    },
    "sameAs": [
      "https://www.linkedin.com/showcase/growclinic-io",
      "https://www.instagram.com/growclinic.io"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {settings?.headerScripts && (
          <script
            id="admin-header-scripts"
            dangerouslySetInnerHTML={{ __html: settings.headerScripts }}
          />
        )}
      </head>
      <body className={`${poppins.variable} font-sans antialiased text-foreground bg-background pt-20`} suppressHydrationWarning>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        {settings?.footerScripts && (
          <script
            id="admin-footer-scripts"
            dangerouslySetInnerHTML={{ __html: settings.footerScripts }}
          />
        )}
      </body>
    </html>
  );
}
