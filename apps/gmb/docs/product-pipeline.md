# Gmb Development Pipeline

## Phase 0 — Product truth and launch guardrails

**Outcome:** no prototype behaviour is presented as a live capability.

- Remove simulated checkout, audit, exports, QR downloads, and Google-action claims from public production flows.
- Replace rating-influencing review language with neutral honest-review language.
- Create the India-first legal, privacy, retention, and refund requirements.
- Define score rubric, protected-field consent, sensitive-review classifier rules, plans, and usage limits.

**Exit criteria:** every visible claim is true, evidenced, or clearly labelled as a preview.

## Phase 1 — Design system and complete flows

**Outcome:** a testable product prototype with consistent GrowClinic styling and all success/failure states.

- Create shared design tokens, typography, components, responsive layouts, empty states, loading states, and error states.
- Design WhatsApp OTP signup, organization creation, Google connect, first audit, consented edit, review escalation, billing, and Super Admin flows.
- Remove public marketing header/footer from authenticated product and Super Admin areas.
- Validate desktop and mobile clinic-owner journeys with target users.

**Exit criteria:** an owner can complete the complete non-live flow without ambiguity; every action communicates whether it is a draft, pending approval, published, or failed.

## Phase 2 — Platform foundation

**Outcome:** secure multi-tenant SaaS skeleton.

- Choose and implement backend, database, queue, file storage, and deployment architecture.
- Implement WhatsApp OTP, organizations, locations, memberships, RBAC, sessions, audit events, rate limits, and Super Admin controls.
- Implement 90-day retention/deletion jobs and encrypted secret/token storage.
- Add tests, CI, environment management, structured logging, alerts, backups, and error monitoring.

**Exit criteria:** tenant-isolation, role-permission, and audit-log tests pass; Super Admin cannot directly modify a GBP location.

## Phase 3 — Google Business Profile integration

**Outcome:** trusted, read-first Google connection.

- Obtain approved Google Cloud project and required Business Profile API access.
- Implement OAuth, account/location discovery, token rotation, disconnect, sync jobs, webhook/notification handling, and sync failure recovery.
- Retrieve supported profile, review, post, media, Q&A, and performance data.
- Build explicit consent and before/after records for protected profile changes.

**Exit criteria:** a connected clinic sees verified data, handles expiry/revocation cleanly, and each published edit has a Google result record.

## Phase 4 — Health Score and action engine

**Outcome:** explainable, useful clinic recommendations.

- Implement health-score rubric and evidence collection.
- Build prioritized action queue, consent modal, validation, publishing, rollback/error handling, and audit timeline.
- Support all specialties through configurable service/category templates, not separate code paths.

**Exit criteria:** every score deduction links to evidence, recommendation, and an owner-controlled action.

## Phase 5 — Reputation and content operations

**Outcome:** safe, repeatable engagement workflows.

- Implement review inbox, review classification, sensitive-review escalation, user notifications, manual approval, and privacy-safe AI drafts.
- Implement post/media/Q&A drafts, policy checks, approval queue, schedule, publish, and status feedback.
- Build ethical review-request templates; never ask for a rating or target only positive reviewers.

**Exit criteria:** no sensitive review can be auto-published; all clinic content actions are attributable and reversible where Google permits.

## Phase 6 — Local visibility and reporting

**Outcome:** show useful progress without false ranking claims.

- Derive and approve keyword sets from GBP data.
- Add a provider-backed geo-grid tracker with quotas, scheduled scans, history, competitor comparison, and confidence indicators.
- Add GBP performance reports: calls, directions, website clicks, views, reviews, response time, score movement, and action completion.

**Exit criteria:** reports distinguish Google-provided facts, modeled insights, and rank-tracker measurements.

## Phase 7 — Billing and controlled launch

**Outcome:** a legally and operationally ready India launch.

- Integrate Razorpay subscriptions, webhook verification, failed-payment recovery, cancellation/refund process, GST invoices, and plan entitlements.
- Launch to a small cohort of clinics; track activation, audit completion, approved changes, published content, review-response time, and retention.
- Conduct security, privacy, accessibility, and Google-policy review before broad availability.

**Exit criteria:** paid workflows are real, supportable, and auditable; production metrics confirm the 15-minute activation promise.

## Suggested delivery order

Complete Phases 0–1 before writing integration code. Then build Phase 2 and Phase 3 together, followed by Phase 4. That sequence keeps design decisions from being recreated after security and Google constraints become real.
