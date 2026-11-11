# 05 — PRD Gap Study: Master Product Documentation v1.0 vs the current platform

| Item | Value |
|---|---|
| Baseline | Alphagrew Master Product Requirements, SRS, Technical Architecture & Delivery Plan, v1.0 (September 2026) |
| Code snapshot | Branch `feat/dashboard-redesign` (contains `main` plus the dashboards, results and mark-entry work), 10 November 2026 |
| Previous study | [02-gap-analysis.md](02-gap-analysis.md), 22 October 2026. Gap IDs (`AUTH-2`, `ELG-1`, …) are reused here. |
| Evidence | Route table (277 API routes), models and migrations, services and actions, frontend screens actually rendered, 153 backend and 35 frontend tests, and [../api/10-frontend-coverage.md](../api/10-frontend-coverage.md) |

Percentages are judgements of how much of each PRD requirement works end to end (database, API, rules, screen and tests). They are for prioritising, not for reporting progress to customers.

---

## 1. Summary

The platform has a strong **campus foundation** and a working **AI interview loop**. Most of the **placement** product, which the PRD rates P0, is still missing: eligibility, application tracking, rounds, offers and placement records. The **assessment engine** (P1) has not been started.

| | 22 Oct | 10 Nov |
|---|---|---|
| Overall PRD coverage (weighted) | ≈ 38% | **≈ 50%** |
| PRD acceptance criteria met (section 30) | not measured | **6 of 14 fully, 5 partly, 3 not at all** |
| Critical security / tenancy findings open | 2 (T-1 cross-institution leak, S-3 demo login in production) | **0** |

Since October the team closed most of the platform risks: tenant leak, rate limits, password reset, email verification, sessions, audit log, CI, safe defaults and token expiry. The team also built things the PRD does not ask for: an academic results lifecycle, attendance, role dashboards and custom fields. Meanwhile the **P0 placement chain did not move**. That is now the main gap between the product and the PRD's MVP.

**The five largest gaps, in priority order**
1. **Eligibility engine (P0).** Students are checked against the drive's department list only. CGPA, backlogs, batch and skills are not used, and there is no "eligible students" list.
2. **Placement workflow (P0).** An application has no status. There are no shortlists, rounds, interviews, results, offers or placement records. "Placed" is a text field on the student.
3. **Assessment engine (P1).** No question bank, tests, attempts or results. Readiness has an "assessments" dimension with no data behind it.
4. **Institution setup screens (P0).** Batches, campuses, institution settings and placement policy have working APIs but no screens. The Classes, Fees and System settings screens save nothing.
5. **Notifications (P1).** Students are not told about new drives, eligibility or application changes. In-app notifications are sample data, and only three emails exist (invitation, registration review, marks sent back).

## Update, 11 November 2026

¹ Increments 1–4 of section 8 are built: the eligibility engine, the placement workflow on the job-posting tables (pipeline, rounds, offers, policies, opt-out, debarment, offer expiry), the institution setup screens (batches, campuses, settings, placement policy) and in-app + email notifications with preferences. See [../api/11-placement-workflow-and-notifications.md](../api/11-placement-workflow-and-notifications.md). Acceptance criteria now: 9 of 14 met, 3 partly (1, 9, 14), 2 not met (6 and 7: assessments).

Still open from these increments: company contacts (PLC-2), interview slot scheduling, placement reports and exports on the new tables, an `applications` source for the dashboard builder, and SMS/push. `debarOnRenege` is stored but not enforced.

---

## 2. Module scorecard

| # | PRD module | PRD priority | 22 Oct | 10 Nov | What changed | What is still missing |
|---|---|---|---|---|---|---|
| 1 | Auth & RBAC | P0 | 60% | **90%** | Password reset, email verification, session list and revoke, rate limits on login, register, reset and API, audit log with viewer, 12-hour token expiry | Token kept in `localStorage` (S-4) |
| 2 | Multi-tenancy | P0 | 80% | **95%** | Placement application leak fixed and tested; `institution_id` added to the five missing tables | Spatie teams (only needed if one user ever spans institutions) |
| 3 | Institution management | P0 | 45% | **75%** ¹ | APIs for campuses, batches, institution settings and logo, placement policy, grade rules | **No screens** for those APIs; no super-admin institution management; Classes, Fees, Timetable and System settings screens are front-end only |
| 4 | Student & faculty management | P0 | 55% | **65%** | Custom form fields, invitations, self-registration with approval, staff accounts, results-derived CGPA and backlogs | Bulk import (CSV/Excel), student documents, recruiter-visible profile |
| 5 | Placement management | P0 | 30% | **80%** ¹ | Drive creation now also writes `placement_drives` and `job_postings` | Company contacts, application status, shortlists, rounds, interviews, results, offers, placement records; two data models still in use |
| 6 | Eligibility engine | P0 | 10% | **90%** ¹ | — | Rule evaluator, eligible-student list, use of the `eligibility_rules` table |
| 7 | Assessment engine | P1 | 0% | **0%** | — (the academic exam and marks workflow is a different feature) | Question bank, all question types, timed attempts, auto-evaluation, results, weak-area analytics |
| 8 | Resume intelligence | P1/P2 | 70% | **70%** | — | Screen to review and correct parsed data; comparison with a job's requirements; check against a live AI provider |
| 9 | Job matching & skill gap | P2 | 0% | **15%** | Skill-gap reports compare the student with a **role** model after an interview | Match % against real jobs, missing requirements per job, student job feed |
| 10 | AI interviewer | P2 | 75% | **80%** | Speech-to-text service on the backend; rubric version stored with each evaluation | Voice in the interview screen, versioned prompt templates, transcript retention and deletion, usage limits |
| 11 | Career readiness | P2 | 60% | **60%** | — | Weights fixed in code (`ReadinessCalculator::WEIGHTS`), not configurable; assessment dimension empty |
| 12 | Notifications & announcements | P1 | 25% | **70%** ¹ | Mail for invitations, registration decisions and rejected marks | In-app notifications (sample data), preferences (403 for students), drive/application/result alerts, SMS/push |
| 13 | Analytics & reporting | P1 | 25% | **60%** | Role dashboards on real data, user-built dashboards and sharing, query engine with per-role data scope | Placement funnel on the new model, exports in the UI, staff report screens still on sample data |
| 14 | Recruiter portal | P3 | 5% | **5%** | — | Everything; recruiter login is deliberately blocked |
| 15 | Super admin / SaaS | P3 | 10% | **10%** | — | Institution onboarding, plans, subscriptions, usage and AI credits, billing |
| 16 | Non-functional | — | 35% | **60%** | CI (tests, MySQL migrations, frontend build), rate limits, `APP_DEBUG=false`, demo reset off by default, code splitting, frontend tests | Error monitoring (Sentry), backups, Redis/S3 for production, accessibility audit, data-retention rules |

---

## 3. Workflow comparison (PRD section 7)

✅ works end to end · 🟡 partly · ❌ missing

### 3.1 Student journey

| PRD step | Today | Gap |
|---|---|---|
| Register | ✅ Self-registration, admin approval, email verification | |
| Build profile | ✅ Career profile with completeness score | |
| Academic details | ✅ Education history; CGPA and backlogs from published results | |
| Upload resume | ✅ PDF/DOC/DOCX, private storage, signed download | |
| AI analysis | 🟡 Parsing and analysis run | No screen to correct parsed data |
| Skill profile | ✅ Skills catalogue | |
| **Assessments** | ❌ | No assessment engine |
| Skill gap | 🟡 Against a role model, after an interview | Not against a job |
| **Practice** | ❌ | No practice content or tests |
| AI mock interview | ✅ Text; resume-aware modes; adaptive difficulty | Voice not in the UI |
| Feedback | ✅ Evaluation, skill-gap report, recommendations | |
| **Job matching** | ❌ | No match %, no job feed |
| Apply | 🟡 Apply to a drive | Only the department is checked |
| **Assessment / interview (company)** | ❌ | No rounds |
| **Placement** | ❌ | No offer or placement record |

### 3.2 Placement officer journey

| PRD step | Today | Gap |
|---|---|---|
| Login | ✅ | |
| Create company | ✅ | No contacts |
| Create job | 🟡 | Company, job and drive are one record in the UI |
| **Define eligibility** | 🟡 | Departments only |
| **Auto-filter eligible students** | ❌ | |
| **Notify** | ❌ | Announcements are written by hand |
| Applications | 🟡 List per drive | No status, no history |
| **Assessment, shortlist, interviews, results** | ❌ | `placement_rounds` and `placement_results` tables have no API |
| **Placement record** | ❌ | |
| Reports | 🟡 Statistics and dashboards | Based on legacy fields; no export in the UI |

### 3.3 Recruiter journey

All steps ❌. The role exists and sign-in is refused with a clear message. The PRD rates the portal P3, so this is expected for the MVP.

### 3.4 AI interview journey

| PRD step | Today |
|---|---|
| Resume → parser → candidate profile → target role | ✅ |
| Interview plan → question → answer | ✅ text; voice transcription exists on the backend only |
| Analysis → follow-up → adaptive difficulty | ✅ |
| Final evaluation → skill gap → recommendations | ✅ |
| Face-to-face / avatar (PRD phase 9, P3) | ❌ |

This is the most complete journey. It already covers the PRD's "flagship differentiator".

---

## 4. Acceptance criteria (PRD section 30)

| # | Criterion | Status | Evidence / gap |
|---|---|---|---|
| 1 | Admin configures institution, departments, courses and batches | 🟡 | Departments and courses have screens; batches and institution settings are API only |
| 2 | Student builds a full profile and uploads a resume | ✅ | `/students/me/*`, career profile screen |
| 3 | Placement officer creates a job and defines eligibility rules | ✅ ¹ | Job editor with every §10 rule field and a live eligible count |
| 4 | System produces an eligible-student list from deterministic rules | ✅ ¹ | `EligibilityEvaluator`; eligible list with failed rules per student |
| 5 | Student applies and tracks application status | ✅ ¹ | Status lifecycle with history, rounds, offers and notifications |
| 6 | Admin or faculty creates an assessment and views results | ❌ | No assessment engine |
| 7 | Student completes an assessment and gets a result | ❌ | No assessment engine |
| 8 | Resume is parsed and stored as structured data | ✅ | `ParseResumeJob`, `ResumeParserTest` |
| 9 | AI resume analysis gives explainable suggestions | 🟡 | Built and tested with stubs; not yet verified with a live provider |
| 10 | Student starts an AI mock interview for a role | ✅ | Interview lifecycle tests |
| 11 | Interview uses resume and profile context | ✅ | Resume deep-dive mode, planner reads resume projects and skills |
| 12 | Completed interview gives a report and recommendations | ✅ | Evaluation, skill gap, recommendations |
| 13 | Tenant isolation prevents cross-institution access | ✅ | Tenant isolation tests for core, marks, interviews and placement |
| 14 | Critical workflows have automated tests and production monitoring | 🟡 | Tests and CI yes; no monitoring |

---

## 5. Architecture and stack differences (PRD sections 11, 15, 16)

| PRD | Today | Comment |
|---|---|---|
| Flutter student app | None; students use the web app | Mobile was removed from scope in the October baseline. Confirm this decision is still current. |
| Separate `admin-web`, `recruiter-web`, `student-app` | One React app (`frontend/`) for every role | Fine for now; a recruiter portal may want its own build |
| Redis for cache and queues | Database queue and cache by default | Move to Redis before load testing |
| S3-compatible object storage | Local private disk | Needed before multi-server deployment |
| Sentry and metrics | Laravel log only | NFR-9 |
| Versioned prompt templates (section 20) | Prompts built in PHP classes; evaluations store `rubric_version` | Prompt and model versions should be stored with every AI call |
| API paths `/jobs`, `/applications`, `/assessments`, `/ai/*`, `/analytics/*` | `/companies`, `/staff/placement/*`, `/interviews/*`, `/dashboards/*` | The PRD's paths are examples. Settle the job and application contract when the placement model is rebuilt. |
| Configurable readiness formula (section 9) | Fixed weights: resume 20, academics 25, assessments 25, interview 30 | Make per-institution |

---

## 6. Built beyond the PRD

These are not in the PRD but now exist and need maintaining. Add them to the PRD so scope and estimates stay honest.

| Capability | Notes |
|---|---|
| Academic results lifecycle | Grade rules, mark schemes, faculty mark entry, HOD/exam-coordinator review, semester publishing and unlock, SGPA/CGPA and backlogs |
| Attendance | Marking, approval, reports; feeds attendance % and readiness |
| Role dashboards and dashboard builder | Student, Teacher, HOD, Examination and Management templates; user-built dashboards; sharing; server-side data scope |
| Custom form fields | Admin-defined fields on students, staff, subjects and exams, usable in dashboards |
| Staff portal screens | Department overview, HOD reports, exam coordinator, staff attendance. **Mostly sample data**, see [../api/10-frontend-coverage.md](../api/10-frontend-coverage.md) |

The academic features are useful for adoption, but they took effort the PRD planned for placement, which is a P0. The academic side is now strong enough that the next increments should go to placement and assessments.

---

## 7. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| MVP cannot be piloted for placements | Acceptance criteria 3–7 fail; placement is the core of the PRD's V1 | Do the eligibility and placement work below before the pilot |
| Two placement data models | `companies` (used by the UI) and `placement_drives` / `job_postings` (written as a copy) drift apart | Make the new tables the source of truth when rebuilding applications |
| Sample-data screens look finished | Staff see the same fixed numbers for every user and may take them as real | Hide or label them until they are wired; most numbers are available from `/dashboards/query` |
| Readiness looks precise but has an empty dimension | The PRD warns against presenting a single score as objective | Show which dimensions are measured; build assessments |
| AI transcripts kept forever | PRD section 19 requires retention and deletion rules and consent | Retention policy and a scheduled purge |
| No monitoring or backups | Pilot incidents would go unnoticed or be unrecoverable | Sentry, backups with a tested restore |

---

## 8. Recommended next increments

Ordered by the PRD's priority matrix (section 32) and by dependency.

| # | Increment | PRD priority | Closes | Rough size |
|---|---|---|---|---|
| 1 | **Eligibility engine**: evaluate CGPA, backlogs, department, batch and skills from `eligibility_rules` against the academic summary; eligible-student list for a drive; block ineligible applications with reasons | P0 | ELG-1, ELG-2, criteria 3–4 | 1–2 weeks |
| 2 | **Placement workflow on the new tables**: `job_applications` with status and history (`job_application_events`), rounds and results, shortlists, offers and placement records; one drive model | P0 | PLC-3 to PLC-6, criterion 5 | 3–4 weeks |
| 3 | **Institution setup screens** for batches, campuses, institution settings and placement policy (APIs exist); enforce the policy when applying | P0 | INST-4, INST-6, INST-7, criterion 1 | 1 week |
| 4 | **Notifications**: in-app notifications on the `notifications` table and email for new eligible drives, application status changes and results; fix student preferences | P1 | NOT-2, NOT-3 | 1–2 weeks |
| 5 | **Assessment engine MVP**: question bank (MCQ, multi-select, true/false, numerical), timed attempts, auto-evaluation, results and weak areas; feed readiness | P1 | ASM-1 to ASM-3, criteria 6–7 | 3–4 weeks |
| 6 | **Job matching**: compare the student with a job posting's requirements; match %, missing skills, job feed | P2 | JOB-1, RES-4 | 1–2 weeks |
| 7 | **Production readiness**: Sentry, backups, Redis and S3 configuration, AI transcript retention, accessibility pass, monitoring for criterion 14 | NFR | NFR-9, NFR-10, AI-6, criterion 14 | 1–2 weeks |
| 8 | **AI polish**: voice answers in the interview screen, versioned prompts, per-institution usage limits, configurable readiness weights | P2 | AI-3, AI-5, RDY-1 | 2 weeks |

Increments 1–4 bring the product to the PRD's MVP scope (section 23), apart from assessments. With increment 5, every MVP item in section 23 is covered. Recruiter portal and SaaS billing stay P3, after a pilot.

**Smaller items worth doing alongside:** bulk student import (STU-2), student documents (STU-6), a parsed-resume correction screen (RES-2), and replacing or hiding the sample-data staff screens.
