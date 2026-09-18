import React from "react";
import { BG, TEXT, MUTED } from "../theme";

const Header = () => (
  <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.07)", background: BG }}>
    <a href="/" className="text-xl font-bold tracking-tight" style={{ color: TEXT }}>GrowClinic</a>
    <a href="/" className="text-sm font-semibold" style={{ color: MUTED }}>Back to home</a>
  </div>
);

export function PrivacyScreen() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'Satoshi', sans-serif" }}>
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm" style={{ color: MUTED }}>Last updated: August 20, 2026</p>
        
        <h2 className="text-xl font-semibold mt-8">1. Introduction</h2>
        <p>Welcome to GrowClinic. This Privacy Policy explains how we collect, use, and protect your data when you use our application to manage your Google Business Profile.</p>
        
        <h2 className="text-xl font-semibold mt-8">2. Google API Services Usage</h2>
        <p>GrowClinic uses Google's Application Programming Interface (API) Services to enable you to manage your Google Business Profile directly from our dashboard.</p>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li><strong>Data Accessed:</strong> We request access to view and manage your Google Business Profile information, including location details, business hours, reviews, and posts.</li>
          <li><strong>Data Use:</strong> We use this data exclusively to display your profile metrics, allow you to edit your business information, and enable you to reply to reviews within the GrowClinic platform.</li>
          <li><strong>Data Storage:</strong> We securely store OAuth access tokens using AES-256-GCM encryption at rest. Profile data (like reviews or stats) is fetched in real-time and briefly cached, but not permanently stored on our servers.</li>
          <li><strong>Google API Services User Data Policy:</strong> GrowClinic's use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-500 underline" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">3. Revoking Access</h2>
        <p>You may disconnect your Google account and revoke our access at any time by clicking "Disconnect Google" in the Settings menu of our application. This instantly deletes your Google OAuth tokens from our database. You may also revoke access directly from your Google Account settings.</p>

        <h2 className="text-xl font-semibold mt-8">4. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at support@growclinic.io.</p>
      </div>
    </div>
  );
}

export function TermsScreen() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'Satoshi', sans-serif" }}>
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold mb-8">Terms of Use</h1>
        <p className="text-sm" style={{ color: MUTED }}>Last updated: August 20, 2026</p>
        
        <h2 className="text-xl font-semibold mt-8">1. Acceptance of Terms</h2>
        <p>By using GrowClinic, you agree to these Terms of Use. If you disagree with any part of the terms, you may not access the service.</p>
        
        <h2 className="text-xl font-semibold mt-8">2. Google Business Profile Integration</h2>
        <p>GrowClinic provides management tools for your Google Business Profile. By connecting your Google account, you authorize GrowClinic to act on your behalf to manage your business information, reviews, and posts via the Google Business Profile API.</p>
        
        <h2 className="text-xl font-semibold mt-8">3. User Responsibilities</h2>
        <p>You are responsible for the accuracy of the business information you publish through GrowClinic and for ensuring your responses to reviews comply with Google's policies and applicable laws.</p>

        <h2 className="text-xl font-semibold mt-8">4. Disclaimers</h2>
        <p>GrowClinic is provided "as is" without any warranties. We are not affiliated with, endorsed, or sponsored by Google LLC.</p>

        <h2 className="text-xl font-semibold mt-8">5. Termination</h2>
        <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
      </div>
    </div>
  );
}
