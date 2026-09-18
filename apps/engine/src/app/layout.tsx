import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrowClinic Engine',
  description: 'Multi-tenant CRM for clinics — lead capture, patients, appointments.',
  robots: 'noindex, nofollow', // the engine is an app, not a marketing site
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
