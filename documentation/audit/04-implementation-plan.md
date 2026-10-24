# 04 — Implementation Plan

| Item | Value |
|---|---|
| Inputs | `02-gap-analysis.md` (gap IDs), `03-workflow-analysis.md`, `PRD.md` v1.1 |
| Priorities | P0–P4 per PRD §32 |
| Estimates | Developer-days (one full-stack developer familiar with the codebase), including tests. Ranges in §3. |
| Order | P0 security and tenant isolation first, then Auth/RBAC, Institution, Student, Placement, Eligibility, Applications; then P1, then P2. Each slice delivers one workflow end to end: migration → model/scope → requests/policy/actions/controller/resources/routes → events/jobs/notifications → React screens → tests. |

Layers: **DB** migrations/models · **API** backend logic and routes · **FE** React screens · **T** tests · **Ops** config/CI.

## 1. Slices

### Slice 0 — Stabilise: tenant leak, security defaults, CI (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S0-1 | Add `institution_id` (backfilled from parent rows) + `BelongsToInstitution` to `company_applications`, `placement_rounds`, `placement_results`, `revaluation_requests`, `marks`; fix `PlacementController@getApplications`; isolation tests for every placement route | TEN-1, TEN-3, T-1, T-2 | DB, API, T | 1.0 | — |
| S0-2 | Review and commit the uncommitted frontend (AI interview view, UI kit, 16 files); remove unrendered prototype components (`TPODashboard`, `RecruiterDashboard`, `StaffDashboard`, `AttendanceModule`, `MarksEntry`) and the Express prototype (`server.ts`, `db.ts`, root `database.sqlite`, `assets/`), plus `backend/alphagrew` and the one-off backend root scripts, after confirmation; add `*.sqlite` to `.gitignore` | NFR-13, S-10 | FE, Ops | 0.5 | — |
| S0-3 | Safe production config: `APP_DEBUG=false` and no `DEMO_RESET_ENABLED` in `.env.example`; Sanctum token expiration; demo login helpers only in development builds; build fails without `VITE_API_BASE_URL`; deployment checklist | NFR-4, NFR-5, S-2, S-3, S-9 | Ops, FE, API | 0.75 | — |
| S0-4 | Rate limiting (named limiters: login, register, password reset, uploads, AI) + 429 tests | AUTH-7, NFR-2, S-1 | API, T | 0.5 | — |
| S0-5 | CI: PHPUnit (SQLite + MySQL service), `tsc`, `vite build`, migration check on MySQL | NFR-11, D-4 | Ops | 1.0 | — |
| S0-6 | Remove duplicate `/placement/*` routes (keep `/staff/placement/*`); fix `fetchStaffWorkload` URL; delete unused API client functions or wire them in later slices | §3–4 of gap analysis | API, FE | 0.25 | — |
| | **Slice total** | | | **4.0** | |

### Slice 1 — Auth hardening & onboarding (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S1-1 | Password reset (forgot/reset endpoints, mail, screens) | AUTH-2 | API, FE, T | 1.0 | S0-4 |
| S1-2 | Email verification (notification, verify route, block apply/offer until verified) | AUTH-3, S-5 | API, FE, T | 1.0 | S1-1 |
| S1-3 | `invitations` table, bulk invite API, accept page (pre-filled registration), expiry | AUTH-3, STU onboarding | DB, API, FE, T | 2.0 | — |
| S1-4 | Self-registration screen + `pending_approval` state + admin approval queue | AUTH-3 | API, FE, T | 1.0 | S1-3 |
| S1-5 | `devices` / session list and revoke; lockout after failed logins | AUTH-4 | DB, API, FE, T | 1.0 | S0-3 |
| S1-6 | `audit_logs` (append-only) + `AuditLogger` service used by admin, placement and super-admin actions; institution audit viewer | AUTH-6, S-8 | DB, API, FE, T | 2.0 | — |
| | **Slice total** | | | **8.0** | |

### Slice F — Frontend foundation (P0, runs alongside Slices 2–4)

New screens from Slice 2 onward are built in this structure; existing screens move over as they are touched.

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| F-1 | Introduce React Router with per-role portals and URL per page; lazy-load portals (bundle split) | NFR-8, F2/F4 | FE | 3.0 | S0-2 |
| F-2 | Route guards (role + permission from `/auth/me`), 403/404 pages | AUTH-5 | FE, T | 1.0 | F-1 |
| F-3 | Typed API client (shared error handling 401/403/422/429), TanStack Query for server state; stop mirroring the dataset to `localStorage` | NFR-12, S-4 | FE | 3.0 | F-1 |
| F-4 | Form library + schema validation; field-level 422 mapping | — | FE | 1.5 | F-3 |
| F-5 | Consolidate the UI kit (one component library, accessible by default); label fixes for icon buttons and inputs; axe in CI | NFR-6 | FE, Ops | 2.5 | F-1 |
| F-6 | Frontend test setup: component tests + Playwright for login per role | NFR-12 | FE, T | 1.5 | F-2 |
| | **Slice total** | | | **12.5** | |

### Slice 2 — Institution foundation (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S2-1 | `batches` (admission year + course), link students and classes; batch admin screens | INST-4 | DB, API, FE, T | 2.0 | F-1 |
| S2-2 | `campuses` + institution settings & branding (logo, colours, communication settings) API and screen | INST-2, INST-7 | DB, API, FE, T | 2.0 | F-1 |
| S2-3 | Classes, subject allocations, timetable (clash checks) APIs; replace the local-only `ClassesModule`, `TimetableModule` | INST-8 | DB, API, FE, T | 3.0 | S2-1 |
| S2-4 | Exam types & exam CRUD; wire grade-rule and mark-scheme admin screens to the existing APIs | INST-5, ASM-4 | API, FE, T | 2.0 | — |
| S2-5 | Placement policies table + settings screen (one-offer, dream-offer, offer deadline) | INST-6 | DB, API, FE, T | 1.0 | — |
| S2-6 | Academic-year rollover (preview, confirm, undo window), batch graduation, alumni status | PRD §6 | API, FE, T | 2.5 | S2-1 |
| S2-7 | Fee structures, dues, payments APIs; replace local-only `FeesModule` | INST-8 | DB, API, FE, T | 2.0 | S2-1 |
| | **Slice total** | | | **14.5** | |

### Slice 3 — Student management (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S3-1 | Bulk import: `imports`, `import_errors`, queued validation/commit, error report download, admin screen | STU-2 | DB, API, FE, T | 3.0 | S2-1, S1-3 |
| S3-2 | `student_documents` + `document_verifications`; student upload screen; staff verification queue | STU-6 | DB, API, FE, T | 2.5 | — |
| S3-3 | Staff academics screen: view student academics, verify education, recalculate (APIs exist) | STU-4 | FE, T | 1.0 | — |
| S3-4 | Profile locking during placement season + correction requests | PRD §6 | DB, API, FE, T | 1.5 | S3-2 |
| S3-5 | Faculty/trainer designations preset; real staff management (replace `StaffManagementController` stub: workload, class assignment) | STU-8 | API, FE, T | 2.0 | S2-3 |
| | **Slice total** | | | **10.0** | |

### Slice 4 — Placement core, eligibility & applications (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S4-1 | `company_contacts`; drives and job postings API writing `placement_drives` / `job_postings`; officer screens move to the new model; legacy `/companies` reads become a view over the new tables | PLC-1–3 | DB, API, FE, T | 3.0 | S0-1 |
| S4-2 | `EligibilityEvaluator` (all §10 fields; reads `student_academic_summaries`, verified `student_academics`, batches, skills, policy flags) + unit tests table | ELG-1 | API, T | 2.0 | S2-1, S3-2 |
| S4-3 | Eligibility rules editor + eligible-student preview for officers | ELG-1, ELG-2 | API, FE, T | 2.0 | S4-1, S4-2 |
| S4-4 | Drive and job state machines; publish (validations) and close (scheduler) | PRD §7.8 | API, T | 1.5 | S4-1 |
| S4-5 | Student job feed with eligibility result per job (`/students/me/jobs`) | JOB-1 (eligibility part) | API, FE, T | 2.0 | S4-2 |
| S4-6 | `job_applications` with state machine + `application_status_histories`; apply (deadline, eligibility snapshot, profile minimum, email verified, idempotency key), withdraw, officer status changes; migrate legacy `company_applications` | PLC-4 | DB, API, FE, T | 3.0 | S4-5, S1-2 |
| S4-7 | Placement policies enforcement (one-offer, opt-out, debarment) in apply | INST-6 | API, T | 1.0 | S4-6, S2-5 |
| S4-8 | Tenant-isolation + authorization tests for all new placement routes | TEN-3 | T | 0.5 | S4-6 |
| | **Slice total** | | | **15.0** | |

**Stop-point:** after Slices 0–4 the MVP placement loop (PRD acceptance 1–5, 13, 15–28) is complete.

### Slice 5 — Rounds, interviews, offers, placements (P0)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S5-1 | `drive_rounds`, `round_results` (bulk results, auto-clear by cut-off later from assessments) | PLC-5 | DB, API, FE, T | 2.5 | S4-6 |
| S5-2 | `interview_schedules`: slots, panel, confirm, no-overlap rule, reminders | PLC-5 | DB, API, FE, T | 2.5 | S5-1 |
| S5-3 | `offers`, `offer_responses`: issue, accept/decline, expiry scheduler, revoke | PLC-6 | DB, API, FE, T | 2.5 | S5-1 |
| S5-4 | `placements` record, dream-offer rule, reports from placements; migrate `students.placed_company` | PLC-6, RPT-2 | DB, API, FE, T | 1.5 | S5-3 |
| | **Slice total** | | | **9.0** | |

### Slice 6 — Notifications (P1)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S6-1 | Laravel database + mail notifications; `notification_preferences`; replace sample `/student/notifications/*` with real `/notifications` for all roles | NOT-2, NOT-3 | DB, API, FE, T | 2.5 | — |
| S6-2 | Wire every event in the PRD §6 notification matrix (templates, recipients, channels); SMS adapter behind an interface | NOT-3 | API, T | 3.0 | S6-1, S5-3 |
| | **Slice total** | | | **5.5** | |

### Slice 7 — Assessment engine (P1)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S7-1 | Question bank (all types, tags, difficulty, global bank) + import | ASM-1 | DB, API, FE, T | 3.0 | F-3 |
| S7-2 | Assessments: sections, randomization, negative marking, audiences (batch/department), re-attempt rules, publish | ASM-2 | DB, API, FE, T | 3.0 | S7-1, S2-1 |
| S7-3 | Attempts: server-side timing, autosave, submit, expiry scheduler, proctoring events (full-screen, tab switch) | ASM-2 | DB, API, FE, T | 3.5 | S7-2 |
| S7-4 | Auto-evaluation, faculty evaluation queue (subjective/coding), results publish, weak-area analytics | ASM-2, ASM-3 | API, FE, T | 3.0 | S7-3 |
| S7-5 | Coding sandbox integration (Judge0 or equivalent) with limits | ASM-1 | API, Ops, T | 2.5 | S7-4 |
| S7-6 | Assessment rounds in placement (link `drive_rounds.assessment_id`, auto-clear by cut-off) | PLC-5 | API, T | 1.0 | S7-4, S5-1 |
| | **Slice total** | | | **16.0** | |

### Slice 8 — Replace sample-data screens (P1)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S8-1 | Staff attendance marking on the real attendance tables (fix `AttendanceController` queries) + HOD approval | Workflow 4-B | API, FE, T | 2.0 | S2-3 |
| S8-2 | HOD department overview & reports from real data | RPT-3 | API, FE, T | 2.0 | S8-1 |
| S8-3 | Exam coordinator module on exams + marks pipeline | ASM-4 | API, FE, T | 2.0 | S2-4 |
| S8-4 | Student materials & assignments (or hide until scoped) | Gap §5 | DB, API, FE, T | 2.5 | S2-3 |
| | **Slice total** | | | **8.5** | |

### Slice 9 — Analytics & exports (P1)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S9-1 | `exports` + async CSV/XLSX for students, applications, placements, results; audit-logged | RPT-4 | DB, API, FE, T | 2.5 | S1-6 |
| S9-2 | Placement funnel, department and institution analytics on new tables | RPT-2, RPT-3 | API, FE, T | 3.0 | S5-4 |
| | **Slice total** | | | **5.5** | |

### Slice 10 — Resume & matching (P2)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S10-1 | Parse review & correction screen; import parsed items into profile | RES-2 | API, FE, T | 2.0 | — |
| S10-2 | Job match % (weighted skill coverage), missing skills, per-job comparison | JOB-1, RES-4 | API, FE, T | 2.5 | S4-5 |
| S10-3 | Skill gap per target role or job (not only per interview) | JOB-2 | API, FE, T | 1.5 | S10-2 |
| S10-4 | Live-provider verification and AI evaluation dataset for resume analysis | RES-3 | Ops, T | 1.5 | S11-1 |
| | **Slice total** | | | **7.5** | |

### Slice 11 — AI governance & metering (P2)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S11-1 | `ai_prompt_versions` (move prompts out of code), store prompt version on outputs | AI-5 | DB, API, T | 2.0 | — |
| S11-2 | `consents` table (versioned consent text) | AI-1 | DB, API, FE, T | 1.0 | — |
| S11-3 | `ai_score_overrides`; provenance shown in reports; use `/report` or remove it | AI-2 | DB, API, FE, T | 1.5 | — |
| S11-4 | `readiness_models` per institution; exclude unmeasured dimensions | RDY-1 | DB, API, FE, T | 1.5 | — |
| S11-5 | Credit metering: `plans`, `tenant_usage`, per-student caps, refusal when exhausted, 80/100% alerts | AI-5 | DB, API, FE, T | 3.0 | S6-1 |
| S11-6 | Retention purge job (audio, transcripts); practice-data deletion | AI-6 | API, T | 1.0 | — |
| S11-7 | Browser voice answers (recording → upload → STT) | AI-3 | FE, API, T | 2.5 | S11-2 |
| | **Slice total** | | | **12.5** | |

### Slice 12 — Super admin & SaaS (P3)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S12-1 | Super-admin portal: institutions CRUD, first admin invite, suspend/reactivate (revoke sessions) | INST-1, SAAS-1 | API, FE, T | 3.0 | S1-3, F-2 |
| S12-2 | Plans, subscriptions, usage dashboard, platform audit view | SAAS-1 | DB, API, FE, T | 4.0 | S11-5, S1-6 |
| | **Slice total** | | | **7.0** | |

### Slice 13 — Recruiter portal (P3)

| ID | Task | Gaps | Layers | Est. | Depends on |
|---|---|---|---|---|---|
| S13-1 | Recruiter registration, `institution_company` approval flow, login enabled | REC-1 | DB, API, FE, T | 3.0 | S1-2, S4-1 |
| S13-2 | Recruiter drives, candidate pool with visibility rules and view logging, shortlist | REC-1, STU-7 | API, FE, T | 4.0 | S13-1, S5-1 |
| S13-3 | Recruiter-side rounds, interviews, selections, offers | REC-1 | API, FE, T | 3.0 | S13-2, S5-3 |
| | **Slice total** | | | **10.0** | |

P4 items (AI coach, alumni network, gamification, integrations) are out of scope for this plan.

## 1.1 Progress

**Slice 0, 22 October 2026 (not committed).** All 126 backend tests pass; `tsc` and `vite build` are clean.

| Task | Status | Notes |
|---|---|---|
| S0-1 | Done | Migration `2026_10_24_000001` adds `institution_id` to five tables, filled from the parent company or student row; the models use `BelongsToInstitution`. Tested with a rollback and re-migrate on seeded data. The applications list now needs `placement.manage`: students held `placement.view` and could list every applicant in their institution. |
| S0-2 | Partly done | Removed the Express prototype, the committed SQLite files, the old `assets/` build, eight one-off backend scripts, and the unreferenced `TPODashboard` and `RecruiterDashboard`. Kept `StaffDashboard` and `MarksEntry`, which have someone else's uncommitted edits, and `AttendanceModule`, which `CampusWorkspace` now renders. The uncommitted frontend work has not been committed. |
| S0-3 | Done | `.env.example` now has debug off and demo reset unset; tokens expire after 720 minutes (`SANCTUM_EXPIRATION`), are pruned daily, and the app signs out on a 401. Demo accounts appear only in dev or `VITE_DEMO_MODE=true` builds. A build without `VITE_API_BASE_URL` fails. |
| S0-4 | Done | Named limiters `login`, `register`, `api`, `uploads`, `ai` and `ai-answers`, each with a test. |
| S0-5 | Done, not yet run | `.github/workflows/ci.yml`: PHPUnit on SQLite, migrate → rollback → migrate on MySQL 8, and a frontend type check and build. The MySQL job has not run yet; local MySQL was not running. |
| S0-6 | Done | Removed the `/placement/*` duplicates (229 API routes now), fixed `fetchStaffWorkload`. |

**Slice 1, 22 October 2026 (not committed).** 136 backend tests pass (10 new in `AuthOnboardingTest`); `tsc` and `vite build` are clean.

| Task | Status | Notes |
|---|---|---|
| S1-1 | Done | `POST /auth/forgot-password` (same answer for unknown addresses) and `/auth/reset-password`; the email link opens `/reset-password` in the React app. A reset clears the lockout and signs out every device. Password minimum is now 8 characters. |
| S1-2 | Done | `User` implements `MustVerifyEmail`. Self-registered students get a signed link (`/auth/email/verify/{id}/{hash}`, works without signing in) that redirects to the app. Changing the profile email resets verification. `POST /companies/{company}/apply` requires a verified address. Fixed a pre-existing bug: `email_verified_at` was not mass assignable, so accounts created through the app were never marked verified; the migration marks existing accounts verified. |
| S1-3 | Done | `invitations` table (SHA-256 token hash, 7-day expiry); bulk invite of up to 200 addresses for students, staff and placement officers; resend, revoke, public preview and accept. Accepting creates a verified, active account and signs the user in. Screens: Onboarding (admin) and `/invitations/accept`. |
| S1-4 | Done | `users.status` (`active`, `pending_approval`, `rejected`, `suspended`). Self-registration creates a pending account and returns no token. Approval queue at `/registrations` with approve and reject (reason required, emailed to the student). Screen: `/register`, plus the queue on the Onboarding screen. |
| S1-5 | Done, simpler than planned | No `devices` table: each Sanctum token already records its browser and last use, so `/auth/sessions` lists tokens and can sign out one device or all others. Lockout: 10 wrong passwords lock the account for 15 minutes (HTTP 423). Screen: Sign-in & Security, for every role. |
| S1-6 | Done | Append-only `audit_logs` (the model refuses updates and deletes) with `AuditLogger`; secrets are stripped. Recorded: sign-in and lockout, logout, password reset and change, email verification, sessions, invitations, registrations, staff and student changes, results publish and unlock, placement drive changes, demo reset. Viewer at `/audit-logs` (`activity.view`) with action and date filters. |

Rate limits changed: per-address limits raised (login 120/min, registration and invitations 30/min) because a whole campus lab can share one public IP; per-account limits stay strict.

## 2. Effort summary

| Priority | Slices | Developer-days |
|---|---|---|
| P0 | 0, 1, F, 2, 3, 4, 5 | 73.0 |
| P1 | 6, 7, 8, 9 | 35.5 |
| P2 | 10, 11 | 20.0 |
| P3 | 12, 13 | 17.0 |
| **Total** | | **145.5** (≈ 29 developer-weeks) |

With two developers working in parallel tracks (backend-heavy slices and Slice F / screens), P0 is roughly 8–9 calendar weeks and P0–P2 roughly 14–16 weeks, which fits the PRD's 12–18 week MVP range for the MVP subset.

## 3. Estimating notes and risks

- Estimates assume the current conventions (`ARCHITECTURE` patterns in the codebase: Form Requests, Actions, Resources, `BelongsToInstitution`) and include feature + tenant-isolation tests. Add ±30% for review and rework.
- **Concurrent edits:** several people are committing to `main`. Agree on branch-per-slice before Slice 0.
- **Product decisions needed before Slice 4/5:** placement policy defaults, recruiter visibility defaults, whether faculty can see full marks of other departments.
- **Infrastructure needed:** MySQL in CI (Slice 0), an SMTP/SMS provider (Slice 6), a code sandbox (Slice 7), an AI provider key and data-residency decision (Slices 10–11).
- **Undefined criteria:** the "LLA" criteria referenced in an earlier audit request are not defined anywhere; they can be mapped to these tasks once provided.
