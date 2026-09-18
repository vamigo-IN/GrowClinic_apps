import React from "react";
import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalList, LegalTable } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "How GrowClinic (Cloutrr Grow Pvt Ltd) collects, uses, shares, and protects your personal data, including disclosures for our AI, advertising, and payment partners. Compliant with India's DPDP Act, 2023.",
    alternates: { canonical: "https://www.growclinic.io/privacy" },
};

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-bold hover:underline"
        >
            {children}
        </a>
    );
}

function Mail({ children }: { children: string }) {
    return (
        <a href={`mailto:${children}`} className="text-primary font-bold hover:underline">
            {children}
        </a>
    );
}

const toc = [
    { id: "intro", title: "Introduction & Who We Are" },
    { id: "scope", title: "Scope of This Policy" },
    { id: "collect", title: "Information We Collect" },
    { id: "use", title: "How We Use Your Information" },
    { id: "cookies", title: "Cookies & Tracking" },
    { id: "ai", title: "AI Features & Automated Processing" },
    { id: "processors", title: "Third-Party Service Providers" },
    { id: "sharing", title: "How We Share Information" },
    { id: "transfers", title: "International Data Transfers" },
    { id: "retention", title: "Data Retention" },
    { id: "security", title: "Data Security" },
    { id: "rights", title: "Your Rights & Choices" },
    { id: "children", title: "Children's Privacy" },
    { id: "client-data", title: "Client & Patient Data" },
    { id: "changes", title: "Changes to This Policy" },
    { id: "grievance", title: "Grievance Officer & Contact" },
];

export default function PrivacyPage() {
    return (
        <LegalLayout
            title="Privacy"
            highlight="Policy"
            lastUpdated={COMPANY.lastUpdated}
            toc={toc}
            intro={
                <>
                    <p>
                        This Privacy Policy explains how {COMPANY.legalName} (&ldquo;{COMPANY.brand}&rdquo;,
                        &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, discloses, and
                        safeguards your information when you visit {COMPANY.site}, our subdomains, or otherwise
                        engage our services.
                    </p>
                    <p>
                        We are committed to protecting your privacy and handling your personal data in
                        accordance with India&rsquo;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP
                        Act&rdquo;), the Information Technology Act, 2000 and its rules, and, where applicable,
                        the EU/UK General Data Protection Regulation (&ldquo;GDPR&rdquo;).
                    </p>
                </>
            }
        >
            <LegalSection id="intro" number={1} title="Introduction & Who We Are">
                <p>
                    {COMPANY.brand} is a healthcare-focused digital growth brand operated by{" "}
                    {COMPANY.legalName}, a company incorporated in India. {COMPANY.brand} provides patient
                    acquisition, marketing automation, and clinic growth services to doctors, clinics, and
                    hospitals.
                </p>
                <LegalList
                    items={[
                        <>
                            <strong>Data Fiduciary / Controller:</strong> {COMPANY.legalName}
                        </>,
                        <>
                            <strong>Registered office:</strong> {COMPANY.registeredAddress}
                        </>,
                        <>
                            <strong>Email:</strong> <Mail>{COMPANY.email}</Mail>
                        </>,
                        <>
                            <strong>Phone:</strong> {COMPANY.phone}
                        </>,
                    ]}
                />
                <p>
                    By accessing or using our websites and services, you acknowledge that you have read and
                    understood this Privacy Policy. If you do not agree, please do not use our services.
                </p>
            </LegalSection>

            <LegalSection id="scope" number={2} title="Scope of This Policy">
                <p>This Policy applies to personal data we process across:</p>
                <LegalList
                    items={[
                        <>
                            <strong>{COMPANY.site}</strong> — our primary marketing website;
                        </>,
                        <>
                            <strong>{COMPANY.auditSubdomain}</strong> — our AI-assisted clinic audit tool, which
                            analyses publicly available and user-supplied information about a practice to produce a
                            growth assessment;
                        </>,
                        <>
                            <strong>{COMPANY.syncSubdomain}</strong> — &ldquo;Sync&rdquo;, our WhatsApp and
                            booking automation product used by clients to communicate with their patients;
                        </>,
                        <>
                            our sales, onboarding, support, and service-delivery activities conducted by email,
                            phone, messaging, or in person.
                        </>,
                    ]}
                />
            </LegalSection>

            <LegalSection id="collect" number={3} title="Information We Collect">
                <p>We collect the following categories of information:</p>
                <p>
                    <strong>a) Information you provide directly.</strong> Name, email address, phone number,
                    clinic/practice name, speciality, city, website URL, and any details you submit through our
                    contact forms, audit requests, booking flows, or onboarding questionnaires.
                </p>
                <p>
                    <strong>b) Account &amp; service data.</strong> For products that require an account (such as
                    Sync), login credentials, profile details, and content you create or upload while using the
                    service.
                </p>
                <p>
                    <strong>c) Payment information.</strong> When we begin accepting online payments, billing
                    details and transactions will be processed by our payment gateway, Razorpay. We do not store
                    your full card number, CVV, or banking credentials on our servers; these are handled directly
                    by Razorpay in line with applicable card-network and RBI standards.
                </p>
                <p>
                    <strong>d) Communications data.</strong> Where you use or your patients interact with the
                    Sync WhatsApp automation, we process message content, phone numbers, and delivery metadata
                    strictly to operate the service on behalf of the relevant clinic.
                </p>
                <p>
                    <strong>e) Technical &amp; usage data.</strong> IP address, browser type, device
                    identifiers, pages visited, referring URLs, and interaction data collected automatically via
                    cookies and similar technologies.
                </p>
                <p>
                    <strong>f) Marketing &amp; advertising data.</strong> Information about how you found us and
                    how you respond to our advertising, collected through analytics and advertising pixels (see
                    Section 5).
                </p>
            </LegalSection>

            <LegalSection id="use" number={4} title="How We Use Your Information">
                <p>We use personal data for the following purposes and on the following legal bases:</p>
                <LegalList
                    items={[
                        "To provide, operate, and improve our websites, the AI audit tool, and the Sync product (performance of a contract / legitimate interests).",
                        "To respond to enquiries, schedule consultations, and deliver the services you request (performance of a contract).",
                        "To process payments, invoicing, and accounting once online payments are enabled (performance of a contract / legal obligation).",
                        "To send service updates, and — where you have consented or as otherwise permitted by law — marketing communications you can opt out of at any time (consent / legitimate interests).",
                        "To measure and improve the performance of our website and advertising campaigns (consent for non-essential cookies / legitimate interests).",
                        "To maintain security, prevent fraud and abuse, and comply with legal and regulatory obligations (legal obligation / legitimate interests).",
                    ]}
                />
            </LegalSection>

            <LegalSection id="cookies" number={5} title="Cookies & Tracking Technologies">
                <p>
                    We use cookies and similar technologies to operate our site, remember your preferences,
                    understand usage, and measure advertising. These include strictly necessary cookies (always
                    active) and optional analytics and advertising cookies that we set only where permitted.
                </p>
                <p>
                    Optional technologies may include Google Analytics, the Google Ads conversion tag, and the
                    Meta (Facebook/Instagram) Pixel, which help us understand campaign performance and reach
                    relevant audiences. You can manage cookies through your browser settings and, where shown,
                    through our cookie consent controls. Disabling non-essential cookies will not affect access to
                    core site content.
                </p>
            </LegalSection>

            <LegalSection id="ai" number={6} title="AI Features & Automated Processing">
                <p>
                    Our audit tool and certain service features use third-party artificial-intelligence
                    technologies, including the OpenAI API and Google Gemini API, to analyse information and
                    generate insights, summaries, or recommendations.
                </p>
                <LegalList
                    items={[
                        "Inputs you provide to these features (for example, a clinic name, website, or audit responses) may be transmitted to these AI providers solely to generate your output.",
                        "We instruct our AI providers to process this data only to deliver the requested functionality. Under OpenAI's and Google's standard API terms, data submitted via the API is not used to train their foundation models.",
                        "AI-generated outputs are provided for informational purposes and may contain inaccuracies; they do not constitute medical, legal, or financial advice and should be independently verified.",
                        "We do not make decisions producing legal or similarly significant effects about you based solely on automated processing without a lawful basis or appropriate safeguards.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="processors" number={7} title="Third-Party Service Providers & Sub-Processors">
                <p>
                    We work with trusted third parties who process data on our behalf or provide infrastructure
                    for our services. Each operates under its own privacy terms, linked below.
                </p>
                <LegalTable
                    headers={["Provider", "Purpose", "Privacy Policy"]}
                    rows={[
                        [
                            "OpenAI",
                            "AI processing for the audit tool and content/automation features (OpenAI API).",
                            <Ext href="https://openai.com/policies/privacy-policy">openai.com/policies</Ext>,
                        ],
                        [
                            "Google (Gemini API)",
                            "AI processing and analysis for audit and automation features.",
                            <Ext href="https://policies.google.com/privacy">policies.google.com</Ext>,
                        ],
                        [
                            "Google Cloud / Google APIs",
                            "Cloud infrastructure, hosting, maps/places, analytics and related developer services.",
                            <Ext href="https://cloud.google.com/terms/cloud-privacy-notice">cloud.google.com</Ext>,
                        ],
                        [
                            "Meta Platforms",
                            "WhatsApp Business / messaging APIs powering Sync, and advertising measurement (Meta Pixel).",
                            <Ext href="https://www.facebook.com/privacy/policy/">facebook.com/privacy</Ext>,
                        ],
                        [
                            "Razorpay",
                            "Payment processing, billing, and subscription management (once online payments are enabled).",
                            <Ext href="https://razorpay.com/privacy/">razorpay.com/privacy</Ext>,
                        ],
                    ]}
                />
                <p>
                    We share only the data necessary for each provider to perform its function, and we require
                    them to maintain appropriate security and confidentiality protections.
                </p>
            </LegalSection>

            <LegalSection id="sharing" number={8} title="How We Share Your Information">
                <p>We do not sell your personal data. We may share it only:</p>
                <LegalList
                    items={[
                        "with the service providers and sub-processors listed in Section 7, to operate our services;",
                        "with professional advisers (such as auditors, lawyers, and accountants) under confidentiality obligations;",
                        "with our affiliate group, including our parent company, for legitimate internal business and administrative purposes;",
                        "where required by law, court order, or a valid request from a public authority;",
                        "in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate safeguards; and",
                        "with your consent, or at your direction.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="transfers" number={9} title="International Data Transfers">
                <p>
                    Some of our service providers (such as OpenAI, Google, and Meta) are located outside India
                    and may process your data in other countries. Where we transfer personal data
                    internationally, we rely on appropriate safeguards — such as the providers&rsquo; contractual
                    commitments and standard contractual clauses — and transfer data only in a manner permitted
                    by applicable law, including the DPDP Act and, where relevant, the GDPR.
                </p>
            </LegalSection>

            <LegalSection id="retention" number={10} title="Data Retention">
                <p>
                    We retain personal data only for as long as necessary to fulfil the purposes described in
                    this Policy, including to provide our services, comply with legal, tax, and accounting
                    obligations, resolve disputes, and enforce our agreements. When data is no longer required,
                    we securely delete or anonymise it.
                </p>
            </LegalSection>

            <LegalSection id="security" number={11} title="Data Security">
                <p>
                    We implement industry-standard administrative, technical, and organisational measures —
                    including encryption in transit, access controls, and reputable cloud infrastructure — to
                    protect personal data against unauthorised access, alteration, disclosure, or destruction. No
                    method of transmission or storage is completely secure, and we cannot guarantee absolute
                    security; however, we work continuously to protect your information and will notify you and
                    the relevant authorities of any breach as required by law.
                </p>
            </LegalSection>

            <LegalSection id="rights" number={12} title="Your Rights & Choices">
                <p>
                    Subject to applicable law, you have the right to:
                </p>
                <LegalList
                    items={[
                        "access the personal data we hold about you and obtain a summary of how it is processed;",
                        "request correction or updating of inaccurate or incomplete data;",
                        "request erasure of your personal data, subject to legal retention requirements;",
                        "withdraw consent at any time, where processing is based on consent;",
                        "object to or restrict certain processing, and request data portability where applicable; and",
                        "nominate another individual to exercise your rights in the event of death or incapacity (as provided under the DPDP Act).",
                    ]}
                />
                <p>
                    To exercise any of these rights, contact us at <Mail>{COMPANY.email}</Mail> or our Grievance
                    Officer (Section 16). We may need to verify your identity before acting on a request. You also
                    have the right to lodge a complaint with the Data Protection Board of India or your local
                    supervisory authority.
                </p>
            </LegalSection>

            <LegalSection id="children" number={13} title="Children's Privacy">
                <p>
                    Our services are intended for businesses and individuals aged 18 and over. We do not
                    knowingly collect personal data from children. Where processing of a child&rsquo;s data is
                    necessary and lawful, we will obtain verifiable parental or guardian consent as required by
                    the DPDP Act. If you believe a child has provided us personal data, please contact us so we
                    can delete it.
                </p>
            </LegalSection>

            <LegalSection id="client-data" number={14} title="Client & Patient Data (Processor Role)">
                <p>
                    When we deliver services to a clinic or healthcare provider — including operating the Sync
                    automation — we may process personal data of that client&rsquo;s patients or contacts on the
                    client&rsquo;s behalf. In those cases, the clinic is the data fiduciary/controller and we act
                    as a data processor, handling such data only on the client&rsquo;s documented instructions
                    and for the purpose of providing the agreed services. Clients are responsible for obtaining
                    the necessary consents from their patients. Patients should direct privacy requests to the
                    relevant clinic.
                </p>
            </LegalSection>

            <LegalSection id="changes" number={15} title="Changes to This Policy">
                <p>
                    We may update this Privacy Policy from time to time to reflect changes in our practices,
                    technology, or legal requirements. We will post the updated version on this page with a
                    revised &ldquo;Effective Date&rdquo;. Material changes will be communicated through
                    appropriate channels. Your continued use of our services after an update constitutes
                    acceptance of the revised Policy.
                </p>
            </LegalSection>

            <LegalSection id="grievance" number={16} title="Grievance Officer & Contact">
                <p>
                    In accordance with the Information Technology Act, 2000 and the DPDP Act, 2023, you may
                    contact our Grievance Officer for any questions, concerns, or complaints regarding this Policy
                    or your personal data:
                </p>
                <LegalList
                    items={[
                        <>
                            <strong>Grievance Officer:</strong> {COMPANY.grievanceOfficer}
                        </>,
                        <>
                            <strong>Company:</strong> {COMPANY.legalName}
                        </>,
                        <>
                            <strong>Email:</strong> <Mail>{COMPANY.email}</Mail>
                        </>,
                        <>
                            <strong>Address:</strong> {COMPANY.registeredAddress}
                        </>,
                        <>
                            <strong>CIN:</strong> {COMPANY.cin}
                        </>,
                    ]}
                />
                <p>
                    We aim to acknowledge and resolve grievances within the timelines prescribed under applicable
                    law.
                </p>
            </LegalSection>
        </LegalLayout>
    );
}
