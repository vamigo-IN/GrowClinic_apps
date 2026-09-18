import React from "react";
import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalList } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Refund & Cancellation Policy",
    description:
        "GrowClinic's refund, cancellation, and digital service-delivery policy for services billed through Razorpay, operated by Cloutrr Grow Pvt Ltd.",
    alternates: { canonical: "https://www.growclinic.io/refund" },
};

function Mail({ children }: { children: string }) {
    return (
        <a href={`mailto:${children}`} className="text-primary font-bold hover:underline">
            {children}
        </a>
    );
}

const toc = [
    { id: "overview", title: "Overview" },
    { id: "nature", title: "Nature of Our Services" },
    { id: "delivery", title: "Digital Service Delivery" },
    { id: "cancellation", title: "Cancellation Policy" },
    { id: "refunds", title: "Refund Eligibility" },
    { id: "non-refundable", title: "Non-Refundable Items" },
    { id: "process", title: "Refund Process & Timelines" },
    { id: "chargebacks", title: "Chargebacks & Disputes" },
    { id: "contact", title: "Contact Us" },
];

export default function RefundPage() {
    return (
        <LegalLayout
            title="Refund &"
            highlight="Cancellation"
            lastUpdated={COMPANY.lastUpdated}
            toc={toc}
            intro={
                <>
                    <p>
                        This Refund &amp; Cancellation Policy explains how cancellations, refunds, and service
                        delivery work for purchases from {COMPANY.legalName}, operating as {COMPANY.brand}. It
                        forms part of our Terms &amp; Conditions.
                    </p>
                    <p>
                        We want every client to be satisfied. Please read this policy carefully before purchasing,
                        and contact us with any questions before completing payment.
                    </p>
                </>
            }
        >
            <LegalSection id="overview" number={1} title="Overview">
                <p>
                    When online payments are enabled, all payments for our Services are processed securely through
                    our payment gateway, <strong>Razorpay</strong>. This policy applies to such payments and
                    works alongside any specific commercial terms agreed in your proposal, order form, or
                    subscription plan. Where a signed agreement states different refund terms, that agreement will
                    govern.
                </p>
            </LegalSection>

            <LegalSection id="nature" number={2} title="Nature of Our Services">
                <p>
                    {COMPANY.brand} provides digital services — including marketing, advertising management,
                    marketing automation (Sync), AI audits, consulting, and related growth services. These are
                    customised, professional services delivered over time, not physical or shrink-wrapped
                    products. As such, refund eligibility reflects the work already performed and any third-party
                    costs already incurred on your behalf.
                </p>
            </LegalSection>

            <LegalSection id="delivery" number={3} title="Digital Service Delivery (No Physical Shipping)">
                <p>
                    {COMPANY.brand} deals exclusively in digital services. We do not sell, ship, or deliver any
                    physical goods, and therefore <strong>no shipping charges apply</strong>.
                </p>
                <LegalList
                    items={[
                        "Access to digital services (such as the audit tool or Sync) is provided electronically, typically immediately or shortly after a successful payment and account setup.",
                        "Managed services and bespoke deliverables are delivered according to the timelines set out in your proposal or order form, via email, our platform, or other agreed digital channels.",
                        "If you do not receive access or a confirmation within a reasonable time after payment, please contact us and we will resolve it promptly.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="cancellation" number={4} title="Cancellation Policy">
                <p>
                    <strong>One-time services &amp; projects.</strong> You may request cancellation of a one-time
                    service before work has commenced for a full refund. Once work has begun, charges for work
                    completed and third-party costs already incurred are non-refundable, and any remaining
                    balance will be refunded on a pro-rata basis at our reasonable assessment.
                </p>
                <p>
                    <strong>Subscriptions &amp; retainers.</strong> You may cancel a subscription or monthly
                    retainer at any time, effective at the end of the current billing cycle. We do not provide
                    pro-rata refunds for the unused portion of a billing cycle already started, unless required by
                    law or stated otherwise in your agreement. Cancellation stops future renewals; it does not
                    automatically refund a payment already made for the current period.
                </p>
            </LegalSection>

            <LegalSection id="refunds" number={5} title="Refund Eligibility">
                <p>Refunds may be considered in the following circumstances:</p>
                <LegalList
                    items={[
                        "a duplicate or erroneous payment was made;",
                        "payment was charged but the corresponding service was not provided or made accessible;",
                        "a cancellation request was received before work commenced on a one-time service; or",
                        "a refund is required under applicable consumer-protection law.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="non-refundable" number={6} title="Non-Refundable Items">
                <p>The following are generally non-refundable:</p>
                <LegalList
                    items={[
                        "work already performed and time already spent delivering the service;",
                        "third-party costs incurred on your behalf — for example, advertising spend paid to Google or Meta, domain or hosting fees, and payment-gateway or transaction charges;",
                        "setup, onboarding, or one-time configuration fees once the work has been carried out; and",
                        "services explicitly marked as non-refundable at the time of purchase.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="process" number={7} title="Refund Process & Timelines">
                <p>
                    To request a refund, email <Mail>{COMPANY.email}</Mail> from your registered email address
                    with your name, invoice/transaction reference, payment date, and the reason for the request.
                </p>
                <LegalList
                    items={[
                        "We will acknowledge your request within 3 business days and aim to assess it within 7 business days.",
                        "Approved refunds are processed back to the original payment method via Razorpay.",
                        "Once initiated, refunds typically reflect in your account within 5–7 business days, depending on your bank or card issuer.",
                        "We will keep you informed of the status throughout the process.",
                    ]}
                />
            </LegalSection>

            <LegalSection id="chargebacks" number={8} title="Chargebacks & Disputes">
                <p>
                    If you have a concern about a charge, please contact us first so we can resolve it directly —
                    this is usually the fastest path. Initiating a chargeback without contacting us may delay
                    resolution. We reserve the right to contest chargebacks we believe are invalid by providing
                    transaction and service-delivery records to the payment provider.
                </p>
            </LegalSection>

            <LegalSection id="contact" number={9} title="Contact Us">
                <p>For any refund, cancellation, or billing questions, reach us at:</p>
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
