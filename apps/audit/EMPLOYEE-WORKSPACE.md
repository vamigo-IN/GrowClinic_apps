# Employee Workspace — Build Spec (parked for next task)

Status: **queued.** Captured so we can resume without re-deriving. This is a large, multi-phase build. It **supersedes and absorbs** the earlier team-gamification plan (XP, levels, streak, badges, leaderboard all live here).

## Guardrails (from product owner)
- **Do NOT modify the existing "My Profile" page.** It stays *Account Settings* — email, password, 2FA, security, basic profile only. Never becomes a dashboard.
- Employee Workspace is a **new, separate sidebar page** — the first page an employee opens each morning. A work dashboard, not an HR profile.
- Feel: Linear / Notion / ClickUp / Stripe Dashboard / GitHub. Premium, minimal, whitespace, rounded cards, subtle shadows, skeleton loaders, responsive, dark-mode, smooth animation. **Avoid enterprise-HRMS clutter.**
- Philosophy: **less reporting, more visibility, less management effort.** Everything auto-generated from real work; avoid manual data entry wherever possible.

## Stack decision needed before build (open question)
The spec asks for **React components**, but the internal CRM (this audit tool) is **vanilla JS + a single `admin.html`**, while the **GrowClinic Next.js site** is React. Decision required:
- **(A)** Build in the existing `admin.html` (vanilla, matches where the team/CRM already lives — no new app, fastest to ship). *Recommended for consistency with the live CRM.*
- **(B)** Build as React and mount a new workspace app/section (matches the spec's "React components," heavier — new build pipeline).
Everything below is stack-agnostic; confirm A or B first.

## Information architecture (refined — fewer, tighter zones)
The 12 requested sections regroup into 4 scannable zones so it reads as *one* dashboard, not a wall:

1. **Hero + Today** (open with what matters now): hero card (avatar, name, designation, department, online status, workload %, today's focus, XP/level/streak, quick actions Message / Assign Task / View Calendar) → Today's Work (today's tasks, high-priority, upcoming deadlines, waiting-for-review, upcoming meetings) → Daily Check-in (morning: top-3 + mood + Start Day; evening: completed + carry-forward + blockers + Finish Day; <1 min; check-in auto-records attendance).
2. **Momentum**: Weekly Snapshot cards (assigned, completed, active projects, meetings, pending reviews, hours logged, overdue, last check-in) + XP & Recognition (level, XP, streak, monthly rank, latest achievement, founder recognition, top badges only) + Performance (completion %, on-time %, attendance %, manager rating, client rating, avg response time — charts + progress bars).
3. **Work**: Projects (beautiful cards: name, progress, role, deadline, status) + Client Responsibility (client, role, projects, status, pending items, upcoming deliverables) + Activity Timeline (auto: completed task, uploaded file, commented, created SOP, joined meeting, updated project).
4. **Profile drawer** (secondary, collapsible — not front-and-center): About (bio, skills, experience, location, timezone, emergency contact), Documents (offer letter, NDA, PAN, Aadhaar, certificates, salary slips — **role-based access**), Assets & Access (laptop, mouse, phone, Google Workspace, Meta, Google Ads, Canva, GitHub, Hostinger, CRM — assigned date + status), Private Notes (**manager-only / HR-only**: career goals, performance notes, 1:1 notes).

## XP rules (from spec)
Daily check-in +5 · daily check-out +5 · task complete +10 · task before deadline +5 · weekly review +20 · SOP +30 · founder recognition +100. Badges (show top only): Deadline Champion, Fast Finisher, Team Player, Client Favorite, SOP Master, Innovator, High Performer, Employee of the Month.

## Data model (new — additive; ~9 employees so keep it lean)
- `employees` (extends `admin_users`): displayName, avatarUrl, designation, department, bio, skills, location, timezone, emergencyContact, workloadPct.
- `xp_ledger`: userId, event, points, refId, createdAt (auditable; powers XP/level/streak/rank).
- `badges` + `employee_badges`.
- `checkins`: userId, date, type(morning/evening), priorities(json), mood, completed(json), carryForward(json), blockers, createdAt → also writes `attendance`.
- `tasks` (or map to existing lead/CRM tasks): assignee, priority, dueAt, status, reviewState.
- `projects` + `project_members` (role, progressPct, deadline, status).
- `clients` + `client_assignments` (already partially present via leads/ownership — reuse where possible).
- `activity` (auto feed), `documents` (role-gated), `assets`.
Reuse existing tables wherever they already hold the data (owners, CRM stages, deal values) rather than duplicating.

## Delivery phases
- **P1 Foundation:** schema + XP engine + hero card + Today's Work + Daily Check-in (attendance). The daily-driver core.
- **P2 Momentum:** Weekly Snapshot + Performance charts + XP & Recognition/badges.
- **P3 Work:** Projects + Client Responsibility + Activity Timeline (auto).
- **P4 Profile drawer:** About + Documents + Assets + Private Notes with role-based access.
- Cross-cutting: skeleton loaders, dark mode, responsive, motion — built in from P1.

## Resume checklist
1. Confirm stack (A vanilla `admin.html` vs B React).
2. Confirm XP values + which badges are auto vs manual.
3. Confirm role matrix for Documents / Private Notes (who sees what).
4. Start P1.
