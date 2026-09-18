import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { TrackingScripts } from "@/components/TrackingScripts";
import { MotionProvider } from "@/components/MotionProvider";

import { prisma } from "@/lib/prisma";
import { safeGtmId, safeMetaPixelId } from "@/lib/tracking-ids";

// Body / UI — IBM Plex Sans
const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Display / headings — Archivo
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  // ... existing metadata ...
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.growclinic.io'),
  title: {
    default: "Healthcare Marketing for Clinics & Doctors | GrowClinic",
    template: "%s | GrowClinic"
  },
  description: "Scale your medical practice with GrowClinic. A healthcare growth agency engineering automated patient acquisition for clinics and doctors worldwide.",
  authors: [{ name: "GrowClinic Team" }],
  creator: "GrowClinic",
  publisher: "Cloutrr Grow (OPC) Private Limited",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.growclinic.io",
    siteName: "GrowClinic",
    title: "Healthcare Marketing for Clinics & Doctors | GrowClinic",
    description: "Scale your medical practice with GrowClinic. A healthcare growth agency engineering automated patient acquisition for clinics and doctors worldwide.",
    images: [
      {
        url: "https://www.growclinic.io/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GrowClinic - Medical Growth Agency",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Healthcare Marketing for Clinics & Doctors | GrowClinic",
    description: "Scale your medical practice with GrowClinic. A healthcare growth agency engineering automated patient acquisition for clinics and doctors worldwide.",
    images: ["https://www.growclinic.io/images/og-image.jpg"],
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
  // Search-engine site verification. Set these env vars in Hostinger and the
  // matching <meta> tags render automatically:
  //   GOOGLE_SITE_VERIFICATION  → Google Search Console (meta-tag method)
  //   BING_SITE_VERIFICATION    → Bing Webmaster Tools (meta-tag method)
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      "msvalidate.01": process.env.BING_SITE_VERIFICATION || "89122CBA86D2D09B939C820E1AF40859",
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build-safe: don't let a missing DB / DATABASE_URL break static prerender.
  let settings: {
    headerScripts: string | null;
    footerScripts: string | null;
    ga4Id: string | null;
    gtmId: string | null;
    metaPixelId: string | null;
  } | null = null;
  try {
    settings = await prisma.siteSettings.findUnique({
      where: { id: "global" },
    });
  } catch {
    settings = null;
  }

  // Google Tag Manager container — driven entirely by the Integrations page
  // (settings.gtmId). Empty = GTM off, so the admin status badge reflects reality.
  const gtmId = safeGtmId(settings?.gtmId);
  const metaPixelId = safeMetaPixelId(settings?.metaPixelId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.growclinic.io/#organization",
        "name": "GrowClinic",
        "legalName": "Cloutrr Grow (OPC) Private Limited",
        "url": "https://www.growclinic.io",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.growclinic.io/images/logo.png"
        },
        "image": "https://www.growclinic.io/images/og-image.jpg",
        "description": "A healthcare growth agency specialising in patient acquisition and clinic engineering for doctors, clinics, and hospitals worldwide.",
        "email": "hi@growclinic.io",
        "telephone": "+91-72877-74212",
        "foundingDate": "2024",
        "knowsAbout": [
          "Healthcare digital marketing",
          "Medical SEO",
          "Patient acquisition",
          "Clinic growth",
          "Google Ads for clinics",
          "Healthcare automation"
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Noida",
          "addressRegion": "Uttar Pradesh",
          "postalCode": "201307",
          "addressCountry": "IN"
        },
        "identifier": {
          "@type": "PropertyValue",
          "name": "CIN",
          "value": "U73100UP2025OPC222487"
        },
        "areaServed": {
          "@type": "Place",
          "name": "Worldwide"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-72877-74212",
          "email": "hi@growclinic.io",
          "contactType": "sales",
          "areaServed": "IN",
          "availableLanguage": ["English", "Hindi"]
        },
        "sameAs": [
          "https://www.linkedin.com/showcase/growclinic-io",
          "https://www.instagram.com/growclinic.io"
        ]
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://www.growclinic.io/#localbusiness",
        "name": "GrowClinic",
        "image": "https://www.growclinic.io/images/og-image.jpg",
        "logo": "https://www.growclinic.io/images/logo.png",
        "url": "https://www.growclinic.io",
        "telephone": "+91-72877-74212",
        "email": "hi@growclinic.io",
        "priceRange": "₹₹",
        "parentOrganization": { "@id": "https://www.growclinic.io/#organization" },
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Noida",
          "addressRegion": "Uttar Pradesh",
          "postalCode": "201307",
          "addressCountry": "IN"
        },
        "areaServed": { "@type": "Country", "name": "India" },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "opens": "10:00",
            "closes": "19:00"
          }
        ],
        "sameAs": [
          "https://www.linkedin.com/showcase/growclinic-io",
          "https://www.instagram.com/growclinic.io"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.growclinic.io/#website",
        "url": "https://www.growclinic.io",
        "name": "GrowClinic",
        "description": "Patient acquisition systems and growth engineering for ambitious medical practices worldwide.",
        "publisher": { "@id": "https://www.growclinic.io/#organization" },
        "inLanguage": "en-IN"
      }
    ]
  };

  return (
    <html lang="en" className={`${plex.variable} ${archivo.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
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
        <TrackingScripts
          ga4Id={settings?.ga4Id}
          gtmId={gtmId}
          metaPixelId={metaPixelId}
        />
      </head>
      <body className={`font-sans antialiased text-foreground bg-background`} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) — fallback for JS-disabled visitors */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {/* Meta Pixel (noscript) — fallback for JS-disabled visitors */}
        {metaPixelId && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        )}
        <MotionProvider>
          <SiteChrome>{children}</SiteChrome>
        </MotionProvider>
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
