import React from "react";
import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalList } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Terms & Conditions",
    description:
        "The terms governing your use of GrowClinic's website, AI audit tool, and Sync automation, operated by Cloutrr Grow Pvt Ltd.",
    alternates: { canonical: "https://www.growclinic.io/terms" },
};

function Mail({ children }: { children: string }) {
    return (
        <a href={`mailto:${children}`} className="text-primary font-bold hover:underline">
            {children}
        </a>
    );
}

const toc = [
    { id: "acceptance", title: "Acceptance of Terms" },
    { id: "definitions", title: "Definitions" },
    { id: "eligibility", title: "Eligibility" },
    { id: "services", title: "Our Services" },
    { id: "accounts", title: "Accounts & Registration" },
    { id: "fees", title: "Fees, Payments & Taxes" },
    { id: "acceptable-use", title: "Acceptable Use" },
    { id: "third-party", title: "Third-Party Services" },
    { id: "ip", title: "Intellectual Property" },
    { id: "confidentiality", title: "Confidentiality" },
    { id: "disclaimers", title: "Disclaimers & No Guarantee" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "indemnity", title: "Indemnification" },
    { id: "termination", title: "Term & Termination" },
    { id: "law", title: "Governing Law & Disputes" },
    { id: "general", title: "General & Contact" },
];

export default function TermsPage() {
    return (
        <LegalLayout
            title="Terms &"
            highlight="Conditions"
            lastUpdated={COMPANY.lastUpdated}
            toc={toc}
            intro={
                <>
                    <p>
                        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the
                        websites, products, and services provided by {COMPANY.legalName} under the{" "}
                        {COMPANY.brand} brand (collectively, the &ldquo;Services&rdquo;). Please read them
                        carefully.
                    </p>
                    <p>
                        By accessing {COMPANY.site}, our subdomains, or engaging our Services, you agree to be
                        bound by these Terms. If you are entering into these Terms on behalf of a clinic,
                        company, or other entity, you represent that you are authorised to bind that entity.
                    </p>
                </>
            }
        >
            <LegalSection id="acceptance" number={1} title="Acceptance of Terms">
                <p>
                    These Terms constitute a legally binding agreement between you (&ldquo;you&rdquo;,
                    &ldquo;Client&rdquo;, or &ldquo;user&rdquo;) and {COMPANY.legalName} (&ldquo;
                    {COMPANY.brand}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). If you do not agree with any part
                    of these Terms, you must not use our Services.
                </p>
            </LegalSection>

            <LegalSection id="definitions" number={2} title="Definitions">
                <LegalList
                    items={[
                        <>
                            <strong>&ldquo;Services&rdquo;</strong> means our website, the AI audit tool at{" "}
                            {COMPANY.auditSubdomain}, the Sync automation at {COMPANY.syncSubdomain}, and any
                            marketing, consulting, or growth services we provide.
                        </>,
                        <>
                            <strong>&ldquo;Content&rdquo;</strong> means any text, data, graphics, or other
                            material made available through the Services.
                        </>,
                        <>
                            <strong>&ldquo;Client Data&rdquo;</strong> means data you or your end-users submit to
                            or generate through the Services.
                        </>,
                    ]}
                />
            </LegalSection>

            <LegalSection id="eligibility" number={3} title="Eligibility">
                <p>
                    You must be at least 18 years old and capable of forming a binding contract to use the
                    Services. The Services are intended for healthcare professionals, clinics, hospitals, and
                    businesses, not for use by patients or consumers for personal medical purposes.
                </p>
            </LegalSection>

            <LegalSection id="services" number={4} title="Our Services">
                <p>
                    {COMPANY.brand} provides patient-acquisition systems, digital marketing, marketing
                    automation, and related growth services for healthcare practices. This includes:
                </p>
                <LegalList
                    items={[
                        "an AI-assisted clinic audit tool that generates growth assessments based on available and user-supplied information;",
                        "Sync, a WhatsApp and booking automation product for patient communication; and",
                        "managed marketing, advertising, and consulting services as agreed in a separate proposal, order form, or statement of work.",
                    ]}
                />
                <p>
                    Specific deliverables, scope, and commercial terms for managed services are set out in the
                    applicable proposal or order form, which forms part of these Terms. We may modify, suspend, or
                    discontinue any part of the Services with reasonable notice where practicable.
                </p>
            </LegalSection>

            <LegalSection id="accounts" number={5} title="Accounts & Registration">
                <p>
                    Certain Services require an account. You agree to provide accurate, current, and complete
                    information and to keep it updated. You are responsible for safeguarding your login
                    credentials and for all activity under your account. Notify us promptly of any unauthorised
                    use.
                </p>
            </LegalSection>

            <LegalSection id="fees" number={6} title="Fees, Payments & Taxes">
                <p>
                    Fees for the Services are set out in the applicable proposal, order form, or pricing page.
                    When online payments are enabled, they will be processed securely through our payment
                    gateway, <strong>Razorpay</strong>; by making a payment you also agree to Razorpay&rsquo;s
                    applicable terms.
                </p>
                <LegalList
                    items={[
                        "All fees are exclusive of applicable taxes (including GST), which will be added where required by law.",
                        "Unless otherwise stated, fees are payable in advance, and subscriptions renew automatically until cancelled in accordance with our Refund & Cancellation Policy.",
                        "Late or failed payments may result in suspension of the Services after reasonable notice.",
                        "Refunds and cancellations are governed by our Refund & Cancellation Policy, which forms part of these Terms.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="acceptable-use" number={7} title="Acceptable Use">
                <p>You agree not to use the Services to:</p>
                <LegalList
                    items={[
                        "violate any applicable law or regulation, including advertising, healthcare, data-protection, and consumer-protection laws;",
                        "send unsolicited, deceptive, or unlawful communications, or use the Services in a way that breaches WhatsApp, Meta, or Google platform policies;",
                        "infringe the intellectual-property or privacy rights of others;",
                        "upload malicious code, attempt to gain unauthorised access, or interfere with the integrity or performance of the Services;",
                        "make false or misleading medical claims, or provide content that is unlawful, harmful, or deceptive; or",
                        "reverse engineer, resell, or misuse the Services or any underlying technology.",
                    ]}
                />
                <p>
                    You are solely responsible for ensuring that any content, claims, and patient communications
                    delivered through the Services comply with applicable medical-advertising and ethics
                    regulations.
                </p>
            </LegalSection>

            <LegalSection id="third-party" number={8} title="Third-Party Services">
                <p>
                    The Services rely on third-party technologies and platforms, including the OpenAI API, Google
                    (Gemini and Google Cloud) APIs, Meta (WhatsApp/advertising) APIs, and Razorpay. Your use of
                    features powered by these providers may also be subject to their respective terms and
                    policies. We are not responsible for the acts, omissions, availability, or content of
                    third-party services, and outputs generated by AI providers are provided on an
                    &ldquo;as-is&rdquo; basis.
                </p>
            </LegalSection>

            <LegalSection id="ip" number={9} title="Intellectual Property">
                <p>
                    The {COMPANY.brand} name, logo, website, software, methodologies, and all related
                    intellectual property are owned by {COMPANY.legalName} or its licensors and are protected by
                    applicable laws. We grant you a limited, non-exclusive, non-transferable right to use the
                    Services for their intended purpose during your engagement.
                </p>
                <p>
                    You retain ownership of your Client Data and pre-existing materials you provide. You grant us
                    a limited licence to use such data and materials solely to provide and improve the Services.
                    Unless otherwise agreed in writing, ownership of bespoke deliverables transfers to you upon
                    full payment.
                </p>
            </LegalSection>

            <LegalSection id="confidentiality" number={10} title="Confidentiality">
                <p>
                    Each party may receive confidential information from the other. Both parties agree to keep
                    such information confidential, use it only to perform under these Terms, and protect it with
                    reasonable care. This obligation does not apply to information that is public through no fault
                    of the receiving party or that must be disclosed by law.
                </p>
            </LegalSection>

            <LegalSection id="disclaimers" number={11} title="Disclaimers & No Guarantee of Results">
                <p>
                    The Services are provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. To
                    the maximum extent permitted by law, we disclaim all warranties, express or implied,
                    including merchantability, fitness for a particular purpose, and non-infringement.
                </p>
                <p>
                    <strong>
                        Marketing and growth outcomes depend on many factors outside our control. We do not
                        guarantee any specific number of leads, bookings, patients, rankings, revenue, or return
                        on investment.
                    </strong>{" "}
                    Any examples, case studies, or projections are illustrative and not a promise of results. The
                    audit tool and AI outputs are informational only and do not constitute medical, legal,
                    financial, or professional advice.
                </p>
            </LegalSection>

            <LegalSection id="liability" number={12} title="Limitation of Liability">
                <p>
                    To the maximum extent permitted by law, neither party will be liable for any indirect,
                    incidental, special, consequential, or punitive damages, or for any loss of profits,
                    revenue, data, or goodwill. Our total aggregate liability arising out of or relating to the
                    Services will not exceed the total fees paid by you to us for the Services in the three (3)
                    months immediately preceding the event giving rise to the claim. Nothing in these Terms
                    limits liability that cannot be excluded under applicable law.
                </p>
            </LegalSection>

            <LegalSection id="indemnity" number={13} title="Indemnification">
                <p>
                    You agree to indemnify and hold harmless {COMPANY.legalName}, its officers, employees, and
                    affiliates from any claims, damages, liabilities, and expenses (including reasonable legal
                    fees) arising from your breach of these Terms, your Client Data, or your violation of any law
                    or third-party right.
                </p>
            </LegalSection>

            <LegalSection id="termination" number={14} title="Term & Termination">
                <p>
                    These Terms remain in effect while you use the Services. Either party may terminate an
                    engagement as set out in the applicable order form or, where none applies, on reasonable
                    notice. We may suspend or terminate access immediately for breach of these Terms, non-payment,
                    or unlawful use. Upon termination, your right to use the Services ceases; provisions that by
                    their nature should survive (including payment, IP, confidentiality, disclaimers, and
                    liability) will survive.
                </p>
            </LegalSection>

            <LegalSection id="law" number={15} title="Governing Law & Dispute Resolution">
                <p>
                    These Terms are governed by the laws of India. Subject to the below, the courts at Hamirpur,
                    Uttar Pradesh shall have exclusive jurisdiction. The parties will first attempt to resolve
                    any dispute amicably through good-faith discussions. Failing resolution, disputes shall be
                    referred to arbitration under the Arbitration and Conciliation Act, 1996, seated in Hamirpur,
                    Uttar Pradesh, conducted in English by a sole arbitrator.
                </p>
            </LegalSection>

            <LegalSection id="general" number={16} title="General & Contact">
                <p>
                    These Terms, together with any applicable order form and our Privacy Policy and Refund &amp;
                    Cancellation Policy, constitute the entire agreement between the parties. If any provision is
                    found unenforceable, the remaining provisions remain in effect. Our failure to enforce a
                    right is not a waiver. We may update these Terms from time to time, with the revised version
                    posted on this page.
                </p>
                <p>For questions about these Terms, contact us:</p>
                <LegalList
                    items={[
                        <>
                            <strong>{COMPANY.legalName}</strong> (operating as {COMPANY.brand})
                        </>,
                        <>
                            <strong>Email:</strong> <Mail>{COMPANY.email}</Mail>
                        </>,
                        <>
                            <strong>Phone:</strong> {COMPANY.phone}
                        </>,
                        <>
                            <strong>Address:</strong> {COMPANY.registeredAddress}
                        </>,
                        <>
                            <strong>CIN:</strong> {COMPANY.cin}
                        </>,
                    ]}
                />
            </LegalSection>
        </LegalLayout>
    );
}
