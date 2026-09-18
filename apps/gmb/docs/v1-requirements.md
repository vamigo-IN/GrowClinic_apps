# Gmb V1 Product Requirements

**Product URL:** `gmb.growclinic.io`

## Product goal

Give a clinic owner a trustworthy, consent-led way to discover and resolve Google Business Profile gaps. Gmb improves the factors the clinic controls; it must not guarantee rankings, appointments, revenue, or any Google outcome.

## Target customers

- Independent doctors and clinics
- Multi-specialty hospitals
- Healthcare practices across all specialties

Agency and affiliate workspaces are explicitly out of V1.

## Primary workflow

1. A clinic owner creates an organization using WhatsApp OTP.
2. The owner accepts product terms, privacy notice, Google API disclosure, and data-retention notice.
3. The owner connects their Google account and selects the verified facility-level profile.
4. Gmb synchronizes allowed GBP data and calculates the Health Score.
5. The owner sees the profile facts, score evidence, prioritized gaps, and recommended actions.
6. For each change, Gmb shows the current value, recommended value, policy rationale, and expected effect.
7. The owner explicitly approves a change; Gmb validates and publishes it through the appropriate Google API.
8. Gmb records the action, actor, time, before/after value, and Google result in the audit log.

## Health Score

The score must be explainable, not randomly generated. Every category includes an evidence source and action.

| Category | Examples |
| --- | --- |
| Identity and NAP | Name, address, phone, map pin, website consistency |
| Core profile data | Primary category, secondary categories, description, services, attributes |
| Patient access | Hours, special hours, appointment URL, accessibility information |
| Trust and reputation | Review response coverage, response time, sensitive-review queue |
| Content freshness | Posts, current photos, media coverage, Q&A activity |
| Local visibility readiness | Specialty/service terms, locality coverage, competitor/keyword opportunities |

The UI must show a score range, evidence, confidence, and a clear statement that Google determines rankings.

## Protected change policy

The following fields require a deliberate confirmation for every change:

- Business name
- Address
- Primary category
- Regular and special hours
- Appointment URL
- Practitioner data

No bulk edit, AI action, or Super Admin action can bypass this confirmation. Secondary categories, services, descriptions, posts, media, and Q&A also use user approval in V1.

## Review safety policy

Flag a review as sensitive when any of these signals apply:

- One-star rating
- Possible malpractice, harm, or patient-safety concern
- Medical treatment, diagnosis, or identifiable health context
- Billing, refund, insurance, or payment dispute

Sensitive reviews are never auto-replied to. All profile users with review permissions receive an in-app alert. Gmb may create a privacy-safe draft but requires manual approval and warns users not to confirm a patient relationship or discuss treatment publicly.

## Local visibility tracking

Gmb derives candidate tracked keywords from approved GBP categories, services, description, website content where authorized, and location. The user must confirm the final keyword set before scans begin. Every plan has limits for locations, users, AI drafts, post volume, reports, rank scans, and support.

## Roles

| Role | Scope | May publish GBP changes? |
| --- | --- | --- |
| Super Admin | Internal platform operations | No |
| Clinic/Hospital Admin | Organization and locations | Yes, after consent |
| Location Manager | Assigned locations | Only when granted approval permission |
| Content Reviewer | Assigned locations | Approves/rejects drafts |
| Analyst | Assigned locations | No |

## Non-functional requirements

- WhatsApp OTP login with expiry, rate limiting, retry limits, and re-verification for sensitive actions.
- Tenant-isolated data model and server-side authorization on every request.
- Encrypted Google OAuth tokens; delete immediately on disconnect.
- 90-day retention for public review content and generated drafts; customer deletion controls.
- Immutable audit records for auth, roles, Google connections, consent, edits, publishing, exports, and support access.
- Razorpay Checkout, server-side payment verification, GST invoices, cancellation/refund workflow.
- India-first legal pages: Terms, Privacy, Refund/Cancellation, Google API disclosure, consent/retention notice, and grievance contact.
