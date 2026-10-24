# ALPHAGREW — Smart Campus & Career Intelligence Platform

**Master Product Requirements, SRS, Technical Architecture & Delivery Plan**

Chromolog Technologies · Version 1.1 · October 2026

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | September 2026 | Initial master documentation (PDF). |
| 1.1 | 22 October 2026 | **Removed** all mobile / Flutter scope: every role, including students, uses the React web application. Affected: §1 delivery model, §11 stack, §12 architecture, §16 repository structure (Flutter structure deleted), §17 screen inventory, §18, §22 phase deliverables, §24, §25 QA. **Added** (marked `[Added v1.1]`): permission matrix (§4.1); Campus Academics module (§5.2, §6); authentication hardening (§6); student onboarding, profile completion and locking, document verification, bulk import (§6); academic-year rollover and batch graduation (§6); placement policies (§6); assessment details (§6); notification matrix (§6); super admin, institution admin and faculty journeys (§7.5–7.7); status state machines (§7.8); recruiter onboarding and data visibility (§7.3); AI governance and credit metering (§8.1–8.2); configurable readiness (§9); eligibility rule fields (§10); tenant implementation rules (§13.1); database additions (§14.1); API conventions and missing endpoints (§15.1–15.2); frontend conventions (§16.1); acceptance criteria 15–44 (§30); handoff items (§33). Changes are based on the code audit in `documentation/audit/`. |

---

## 1. Document Control

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Master Product Documentation / PRD / SRS / Technical Blueprint |
| Version | 1.1 |
| Primary Audience | Product, Development, QA, UI/UX, Management, Institutions |
| Delivery Model | **Web (React) + API + AI Services** — no mobile app. Students, faculty, placement officers, admins and recruiters all use the responsive web application. *(Changed v1.1)* |
| Architecture Direction | Modular, API-first, SaaS-ready |

## 2. Executive Summary

Alphagrew is a unified Campus Management, Placement Management, Student Development and AI Career Readiness platform. It connects institution administration, student profiles, assessments, resumes, skills, job opportunities, placement workflows and AI-powered interview practice.

Core product equation:

> Campus Data + Student Skills + Assessments + Resume Intelligence + AI Interviews + Placement = Career Readiness Platform

## 3. Product Vision & Objectives

Vision: help institutions move from simply managing students to continuously measuring, developing and improving student career readiness.

- Digitize student and placement operations.
- Centralize academic and career information.
- Automate placement eligibility and application workflows.
- Give students structured assessment and interview preparation.
- Use AI to analyze resumes, interviews and skill gaps.
- Provide actionable institution and department analytics.
- Create a scalable multi-institution SaaS platform.

## 4. Target Users & Roles

| Role | Primary Responsibilities |
|---|---|
| Super Admin | Platform, institutions, plans, global configuration, monitoring. |
| Institution Admin | Departments, courses, batches, students, faculty, settings. |
| Placement Officer | Companies, jobs, eligibility, drives, applications, interviews, placements. |
| Faculty/Trainer | Students, assessments, training, performance review. |
| Student | Profile, resume, assessments, jobs, AI interviews, career roadmap — **on the web**. |
| Recruiter | Company profile, jobs, candidate filtering, assessment/interview workflow. |

`[Added v1.1]` **Role vs designation.** A *role* is the account type and decides which portal a user lands in (six fixed roles). A *designation* is a job title inside one institution (e.g. HOD, Exam Coordinator, Trainer) that adds permission bundles to a staff account. Super Admin and Recruiter belong to no institution; every other role belongs to exactly one.

### 4.1 Permission Matrix `[Added v1.1]`

Actions: **V** view · **C** create · **U** update · **D** delete · **A** approve/publish · **E** export. "own" = the user's own records; "dept" = own department; "shared" = candidates shared with the recruiter's company through a drive.

| Resource | Super Admin | Institution Admin | Placement Officer | Faculty / Trainer | Student | Recruiter |
|---|---|---|---|---|---|---|
| Institutions, plans, subscriptions, usage | V C U D A E | V (own) | — | — | — | — |
| Institution settings & branding | V | V U | — | — | — | — |
| Departments, courses, batches, semesters, academic years | V | V C U D | V | V | V (own) | — |
| Staff accounts & designations | V | V C U D | — | V (dept) | — | — |
| Students (records) | V | V C U D E | V E | V (dept) U (dept) | V U (own) | V (shared, visible fields) |
| Student documents | V | V A | V | V (dept) A (dept) | V C D (own) | — |
| Bulk imports | V | V C | — | — | — | — |
| Attendance | — | V E | — | V C U (assigned) A (HOD) | V (own) | — |
| Marks & results | — | V A E | V (summary) | V C U (assigned) A (designation) | V (own, published) | — |
| Companies & contacts | V | V | V C U D | — | V (published) | V U (own company) |
| Jobs & drives | V | V | V C U D A | — | V (eligible) | V C U (own company) |
| Eligibility rules | — | V | V C U D | — | V (results only) | V |
| Applications | — | V E | V U A E | V (dept) | V C U (own: apply/withdraw) | V U (shared) |
| Rounds, interview slots, results | — | V | V C U D A | V (assigned panel) | V (own) | V C U (own drives) |
| Offers & placements | — | V E | V C U A E | V (dept) | V U (own: accept/decline) | V C (own drives) |
| Question bank & assessments | V (global bank) | V | V C (placement rounds) | V C U D A | V (assigned), attempt | V C (own drives) |
| Resumes & AI analysis | — | — | V (applicants) | V (dept) | V C D (own) | V (shared) |
| AI interviews & reports | V (usage only) | V (aggregate) | V (applicants) | V (dept) | V C (own) | — |
| Readiness scores | — | V E | V | V (dept) | V (own) | — |
| Announcements & notifications | V C | V C U D | V C (placement) | V C (dept) | V | V (own) |
| Reports & analytics | V | V E | V E | V (dept) E | V (own) | V (own drives) |
| Audit logs | V E | V (own institution) | — | — | — | — |

## 5. Scope of Work

### 5.1 Core Modules

- Authentication, authorization and role-based access control.
- Institution, campus, department, course, batch and academic-year management.
- Student, faculty and trainer management.
- Student academic, skill, project, certification and document profiles.
- Company, recruiter, job and placement-drive management.
- Eligibility engine and student application workflow.
- Assessment and mock-test engine.
- Resume upload, parsing and AI analysis.
- Job matching and skill-gap analysis.
- AI mock interviewer with resume-aware questioning (browser-based text and voice).
- Interview evaluation and readiness analytics.
- Notifications, announcements and reminders.
- Institution, department, student and placement analytics.
- Multi-tenant SaaS foundation and subscription-ready architecture.

### 5.2 Campus Academics Module `[Added v1.1]`

Attendance, timetable, exams, marks and result publishing, and fees are part of the product. They supply the CGPA, backlog and attendance figures that placement eligibility depends on. Requirements are in §6 (Campus Academics).

## 6. Functional Requirements

### Authentication & Access

- User registration/login, logout and password reset.
- Token/session management and device awareness.
- Role-based permissions.
- Institution-level data isolation.
- Audit logging for important administrative actions.
- `[Added v1.1]` Email verification before any placement action (apply, offer response).
- `[Added v1.1]` Password reset by emailed, single-use link valid for 60 minutes.
- `[Added v1.1]` API tokens expire after 12 hours of inactivity; users can see and revoke their active sessions (device name, last used).
- `[Added v1.1]` Rate limits: login 5/min per email + IP; register 5/min per IP; password reset 3/hour per email; file uploads 20/hour per user; AI requests per §8.2.
- `[Added v1.1]` Five failed logins lock the account for 15 minutes and are audit-logged.

### Institution Management

- Create and configure institutions/campuses.
- Manage departments, courses, batches, semesters and academic years.
- Configure grading and placement rules.
- Configure institution branding and communication settings.
- `[Added v1.1]` **Academic-year rollover.** At year end an admin runs rollover: the new academic year becomes active; students advance one year; final-year batches are marked *graduated* and their students become *alumni* (read-only accounts that keep placement records; no new applications). Rollover is previewed (counts per batch), confirmed, and audit-logged; it can be undone within 7 days if no new-year data exists.
- `[Added v1.1]` **Batch** = admission year + course (e.g. "B.Tech CSE 2023–2027"). Every student belongs to exactly one active batch; eligibility rules can target batches.

### Student Management

- Create/import student profiles.
- Manage personal, academic and career information.
- Track skills, projects, certifications and experience.
- Upload and manage documents.
- Expose only authorized fields to recruiters.
- `[Added v1.1]` **Onboarding.** Students join by (a) an invitation link sent by the institution (pre-fills institution, department, batch; single use; expires in 14 days) or (b) self-registration with an institution code, which places the account in *pending approval* until an admin approves it. Accounts are *active* only after email verification.
- `[Added v1.1]` **Profile completion %.** Weighted sections: basics 15, contact 10, links 10, photo 5, preferences 10, skills (≥3) 20, projects (≥1) 15, experience or certification (≥1) 15. Shown on the dashboard; institutions may require a minimum (default 70%) before applying.
- `[Added v1.1]` **Profile locking.** During an active placement season, academic data (prior education, CGPA) is locked once verified. Changes go through a correction request approved by staff.
- `[Added v1.1]` **Document verification.** Documents (mark sheets, ID, certificates) move `pending → verified | rejected` (rejection needs a reason; the student can re-upload). Only verified prior-education scores are used in eligibility.
- `[Added v1.1]` **Bulk import.**
  - File: CSV or XLSX, UTF-8, max 5,000 rows / 5 MB.
  - Required columns: `name, email, registration_number, department_code, batch_code, year`. Optional: `gender, phone, cgpa, date_of_birth`.
  - Validation per row: required fields, email format, department and batch exist in the institution, registration number and email unique within the institution and within the file.
  - Duplicates: a row matching an existing student by registration number updates that student (if "update existing" is chosen) or is skipped and reported.
  - Processing is queued. The import has a status (`uploaded → validating → validated → importing → completed | failed`) and a downloadable error report (row number, column, message). Valid rows can be imported while invalid ones are reported; invitations are sent to imported students on request.

### Placement Management

- Create companies and recruiter contacts.
- Create job positions and placement drives.
- Configure CGPA, department, backlog, batch, skills and other eligibility rules.
- Automatically identify eligible students.
- Notify students, collect applications and track status.
- Schedule assessments/interviews and record outcomes.
- Maintain offer and placement records.
- `[Added v1.1]` **Placement policies** (configurable per institution, per placement season):
  - *One-offer rule:* once a student accepts an offer, other open applications are withdrawn and new applications are blocked.
  - *Dream-offer rule:* a placed student may apply only to jobs whose CTC is at least X% (default 50%) above the accepted offer, at most once more.
  - *Offer acceptance deadline:* each offer has a respond-by date (default 72 h); unanswered offers expire.
  - *Opt-out:* a student may opt out of placements for the season (e.g. higher studies); opted-out students are excluded from eligible lists.
  - *Debarment:* the placement officer may debar a student (e.g. skipping an accepted drive) for a period, with reason; debarred students cannot apply. All policy actions are audit-logged and notified.

### Campus Academics `[Added v1.1]`

- Classes per course, semester and batch; faculty allocated to subjects per semester.
- Weekly timetable without clashes for class, faculty and room.
- Attendance per subject session; HOD approval and correction with history; attendance percentage is calculated, never typed in.
- Exam types and exam schedule; mark schemes and grade rules per institution.
- Marks entry `draft → submitted → verified → approved → locked`, with rejection back to draft. Publishing a semester locks results and recalculates each student's CGPA and backlogs.
- Revaluation requests within a configurable window.
- Fee structures, dues and recorded payments; fee status derived from dues.

### Assessment Engine

- Question bank with categories, difficulty and tags.
- MCQ, multiple-select, true/false, numerical, subjective and coding support.
- Timed assessments, attempts, auto-evaluation and result generation.
- Department-specific and custom assessments.
- Performance analytics and weak-area identification.
- `[Added v1.1]` **Assessment details.**
  - Sections with their own time limits and question counts.
  - Randomization of question order, option order, and selection from a pool per section.
  - Negative marking per question (default 0).
  - Re-attempt rules: max attempts (default 1 for graded, unlimited for practice), cool-down between attempts, best or latest attempt counts (configurable).
  - Browser proctoring basics: full-screen request, tab-switch / focus-loss logging with counts and timestamps, copy-paste blocked in answer fields, optional auto-submit after N focus losses. Logs are shown to faculty; they are evidence for review, not automatic disqualification.
  - The server owns time; answers after the end time are rejected.
  - Coding questions run in an isolated sandbox service (e.g. Judge0) with limits on CPU, memory, time and network; never on the API server. Hidden and visible test cases; partial marks by passed cases.
  - Subjective and coding answers can be evaluated by faculty (with AI-suggested scores only as an aid).

### Resume Intelligence

- Upload PDF/DOC/DOCX resumes.
- Extract education, skills, projects, experience and certifications.
- Generate structured candidate profile.
- Produce resume quality analysis.
- Compare resume/profile against job requirements.
- Generate skill-gap and improvement recommendations.
- `[Added v1.1]` **Parse review.** After parsing, the student reviews the extracted data and can correct it or import items (skills, projects, certifications) into their profile. Unreadable or scanned files fail with a clear message.

### AI Interviewer

- Configure target role, interview type and difficulty.
- Build interview context from resume and candidate profile.
- Generate contextual questions.
- Ask follow-up questions based on answers.
- Support text/voice first (in the browser); real-time face-to-face avatar as an advanced phase.
- Evaluate technical, behavioral, communication and role-specific dimensions.
- Generate interview report and recommended next steps.
- `[Added v1.1]` See §8.1 AI governance and §8.2 AI credit metering.

### Analytics & Reporting

- Student readiness dashboard.
- Assessment and skill analytics.
- Placement funnel analytics.
- Department/institution summaries.
- Exportable reports with role-based access.
- `[Added v1.1]` Exports in CSV and XLSX, generated asynchronously for large data, with a download link valid for 24 hours; every export is audit-logged.

### Notification Matrix `[Added v1.1]`

Channels: **In-app** (always), **Email**, **SMS** (institution opt-in, critical items only), **Web push** (optional). Users can turn off non-critical email/push in preferences; critical items (marked ★) cannot be turned off.

| Event | Recipients | Channels | Template |
|---|---|---|---|
| Invitation sent ★ | Invited student / staff | Email | `invite` — institution, role, link, expiry |
| Email verification ★ | New user | Email | `verify-email` |
| Password reset ★ | User | Email | `password-reset` |
| Student self-registration pending | Institution admins | In-app, Email | `registration-pending` |
| Bulk import finished | Admin who ran it | In-app, Email | `import-finished` — counts, error report link |
| Document verified / rejected | Student | In-app, Email | `document-status` — reason if rejected |
| Drive published (student eligible) | Eligible students | In-app, Email, Push | `drive-published` — company, role, deadline |
| Application deadline in 24 h | Eligible students who haven't applied | In-app, Push | `deadline-reminder` |
| Application status changed | Student | In-app, Email | `application-status` |
| Shortlisted / round scheduled ★ | Student | In-app, Email, SMS | `round-scheduled` — date, venue/link |
| Interview slot reminder (24 h, 1 h) | Student, panel | In-app, Email, Push | `slot-reminder` |
| Round result published | Student | In-app, Email | `round-result` |
| Offer issued ★ | Student | In-app, Email, SMS | `offer-issued` — respond-by date |
| Offer expiring in 24 h ★ | Student | In-app, Email | `offer-expiring` |
| Offer accepted / declined | Placement officer | In-app, Email | `offer-response` |
| Assessment assigned / closing soon | Students in batch | In-app, Email | `assessment-assigned` |
| Assessment result published | Student | In-app | `assessment-result` |
| Resume analysis ready / failed | Student | In-app | `resume-analysis` |
| AI interview report ready | Student | In-app, Email | `interview-report` |
| AI credits at 80% / exhausted | Institution admins; Super Admin | In-app, Email | `ai-credits` |
| Marks rejected for correction | Faculty who entered them | In-app, Email | `marks-rejected` |
| Results published | Students of the semester | In-app, Email | `results-published` |
| Recruiter registration pending | Placement officers | In-app, Email | `recruiter-pending` |
| Recruiter approved / rejected | Recruiter | Email | `recruiter-status` |
| Institution suspended / reactivated | Institution admins | Email | `tenant-status` |
| Announcement posted | Audience of the announcement | In-app (+ Email if marked important) | `announcement` |

## 7. End-to-End Workflows

### 7.1 Student Journey (web)

Register → Build Profile → Academic Details → Upload Resume → AI Analysis → Skill Profile → Assessments → Skill Gap → Practice → AI Mock Interview → Feedback → Job Matching → Apply → Assessment → Interview → Placement

`[Added v1.1]` Expanded: Invitation or self-registration (with admin approval) → verify email → profile completion with progress % → academics (prior education + derived CGPA) → skills, projects, certifications, experience → documents (verification) → resume upload → parse review and correction → AI resume analysis → readiness score → assessments → skill gap → practice → AI mock interview (setup → consent → session → report) → job feed (eligible + matched) → apply (eligibility checked, deadline, profile minimum) → track status → assessment / interview rounds → offer accept / decline (deadline) → placed → alumni after graduation.

### 7.2 Placement Officer Journey

Login → Create Company → Create Job → Define Eligibility → Auto-filter Eligible Students → Notify → Applications → Assessment → Shortlist → Interviews → Results → Placement Record → Reports

`[Added v1.1]` Expanded: company + contacts → job (role, CTC, skills, openings) → drive (dates, rounds, venue or online) → eligibility rules → preview eligible list → publish and notify → applications with deadline → handle withdrawals → assessment round (auto-cleared by cut-off) → shortlist → interview scheduling (slots, panel) → round results → offer (issue, accept/decline, deadline) → placement record → apply one-offer / dream-offer policy → reports and exports.

### 7.3 Recruiter Journey

Register/Verify → Company Profile → Job → Requirements → Candidate Pool → Filter → Assess → Interview → Select → Offer

`[Added v1.1]` **Recruiter onboarding and approval.** A recruiter registers with a company email (or is invited by a placement officer) → verifies email → requests access to an institution → the institution's placement officer approves or rejects (reason required) → only then can the recruiter see that institution's drives. Approval is per institution (`institution_company`). A recruiter can be suspended by the institution at any time.

`[Added v1.1]` **Candidate data visibility.** Recruiters see only students who applied to their company's drives (or were explicitly shared), and only the profile sections the student marked visible (§6 visibility flags). Contact details (phone, personal email) are hidden until the student is shortlisted for that recruiter's drive. Date of birth, documents, attendance, fees and full marks are never visible. Every recruiter view of a candidate is logged.

### 7.4 AI Interview Journey

Resume → Parser → Candidate Profile → Target Role → Interview Plan → Question → Answer → Analysis → Follow-up → Adaptive Difficulty → Final Evaluation → Skill Gap → Recommendations

`[Added v1.1]` Plus: consent before start; answers by text or browser voice (speech-to-text in the backend); idle timeout (15 min) and resume within the session window; credit check before start (§8.2); transcript retention (§8.1).

### 7.5 Super Admin Journey `[Added v1.1]`

Login → create institution (name, code, domain, plan) → assign plan and limits (students, AI credits, storage) → create the first institution admin (invitation) → monitor usage and AI credits per institution → suspend / reactivate an institution (suspension revokes its users' sessions) → review audit logs → manage the global question bank and platform skill catalogue.

### 7.6 Institution Admin Journey `[Added v1.1]`

Login → institution settings and branding → academic year → departments → courses → batches and semesters → grading rules and mark schemes → placement policies → bulk import students (with error report) → faculty, trainers and placement officers (invitations) → designations and role assignment → document verification queue → academic-year rollover → reports and exports.

### 7.7 Faculty / Trainer Journey `[Added v1.1]`

Login → assigned subjects, classes and batches → question bank → create assessment → assign to batches → monitor attempts and proctoring logs → evaluate subjective and coding answers → publish results → weak-area review per batch → training recommendations. Academic duties: attendance, marks entry and submission, revaluation handling.

### 7.8 Status State Machines `[Added v1.1]`

Every transition is performed by one server-side action, validated against the table below, written to a history table with actor and timestamp, and may fire notifications (§6 notification matrix). Any other transition is rejected with HTTP 422.

**Placement drive**

| From | To | Trigger / actor |
|---|---|---|
| draft | published | Placement officer publishes (needs ≥1 job, eligibility rules, dates) |
| published | closed | Officer closes, or end date passes (scheduler) |
| published | cancelled | Officer cancels (reason; applicants notified) |
| closed | archived | Season ends |

**Job posting**

| From | To | Trigger / actor |
|---|---|---|
| draft | open | Drive published |
| open | closed | Apply deadline passes or officer closes |
| open / closed | filled | Openings reached by accepted offers |
| any except filled | cancelled | Officer cancels |

**Application**

| From | To | Trigger / actor |
|---|---|---|
| — | applied | Student applies (eligible, before deadline, policy allows) |
| applied | withdrawn | Student, before shortlisting |
| applied | shortlisted / rejected | Officer or recruiter |
| shortlisted | in_rounds | First round scheduled |
| in_rounds | in_rounds | A round cleared, next round pending |
| in_rounds | selected / rejected | Last round cleared / any round not cleared |
| selected | offered | Offer issued |
| offered | placed / offer_declined / offer_expired | Student accepts / declines / deadline passes |
| applied, shortlisted, in_rounds | withdrawn_by_policy | One-offer rule after another acceptance |

**Assessment attempt**

| From | To | Trigger / actor |
|---|---|---|
| — | in_progress | Student starts (within window, attempts left) |
| in_progress | submitted | Student submits |
| in_progress | expired | End time passes (scheduler) or auto-submit after focus-loss limit |
| submitted / expired | evaluating | Contains subjective/coding answers |
| submitted / expired | evaluated | Objective only (auto) |
| evaluating | evaluated | Faculty evaluation complete |
| evaluated | published | Faculty publishes results |

**AI interview session**

| From | To | Trigger / actor |
|---|---|---|
| — | planned | Student creates session (credits available) |
| planned | in_progress | Student gives consent and starts |
| in_progress | evaluating | Student finishes, or idle timeout with ≥1 answer |
| in_progress | abandoned | Idle timeout with no answers |
| evaluating | completed / failed | Evaluation job succeeds / fails after retries |

**Offer**

| From | To | Trigger / actor |
|---|---|---|
| — | issued | Officer issues to a selected application |
| issued | accepted / declined | Student, before respond-by |
| issued | expired | Respond-by passes (scheduler) |
| issued | revoked | Officer revokes (reason) |
| accepted | joined / reneged | Officer records joining / reneging (may trigger debarment) |

**Recruiter verification**

| From | To | Trigger / actor |
|---|---|---|
| — | pending | Recruiter requests access to an institution |
| pending | approved / rejected | Placement officer (reason for rejection) |
| approved | suspended | Institution suspends |
| suspended | approved | Institution reinstates |

**Resume and resume analysis**

| From | To | Trigger / actor |
|---|---|---|
| — | uploaded → parsing | Upload accepted; parse job queued |
| parsing | parsed / failed | Parser result |
| parsed | analysis_queued | Student requests analysis (credits available) |
| analysis_queued | analysing → completed / failed | AI job result (failed after retries or invalid output) |

## 8. AI Face-to-Face Interviewer — Detailed Specification

The AI Interviewer is a flagship feature intended to simulate a structured interview using candidate-specific context rather than a static question list. It runs in the browser; voice uses the browser microphone with speech-to-text in the backend.

| Component | Responsibility |
|---|---|
| Resume Parser | Extract structured candidate information. |
| Candidate Context Builder | Create normalized interview context from profile, resume and target role. |
| Interview Planner | Select rounds, topics, difficulty and question strategy. |
| Question Generator | Generate grounded questions and follow-ups. |
| Answer Processor | Convert voice/text response into analyzable content. |
| Evaluation Engine | Assess answer relevance, technical correctness and communication signals. |
| Session Manager | Maintain interview state, history, timing and question progression. |
| Report Generator | Create final scorecard, strengths, gaps and recommendations. |

**AI interview modes:** HR/Behavioral · Technical · Resume-based · Role-based · Mixed placement interview.

**Adaptive interview logic:** Strong answer → increase depth/difficulty. Weak answer → probe fundamentals or ask a clarifying follow-up. Resume-specific claim → verify understanding through progressively deeper questions.

**Important AI design rule:** AI output should be treated as an assistive practice/evaluation signal, not an unquestionable judgment of a student's ability. Scoring rubrics and model versions should be configurable and auditable.

### 8.1 AI Governance `[Added v1.1]`

- **Consent:** before any AI interview or voice recording, the student accepts a consent text (version recorded) describing what is stored, for how long, and that scores are guidance. Consent is stored per session in `consents`.
- **Prompt and model versioning:** prompts are versioned templates (`ai_prompt_versions`); every AI output stores the prompt version, model, provider and parameters.
- **Rubrics:** evaluation rubrics (dimensions and weights) are configurable per institution, versioned, and stored with each evaluation.
- **Human override:** faculty or placement officers can adjust an AI score with a mandatory reason; the original score is kept and both are shown.
- **Provenance in the UI:** each report states whether it was produced by an AI model (name) or by the built-in fallback scorer.
- **Fallback when the provider is down:** the provider chain tries the next provider; if all fail, interviews continue with the curated question bank and are scored by the rule-based fallback (marked as such); resume analysis is retried later and the student is told it is delayed. No partial AI output is shown.
- **Data retention:** audio deleted after transcription (max 7 days); transcripts and AI outputs kept for the student's enrolment plus 1 year, then deleted or anonymised by a scheduled purge; students can request deletion of practice interviews at any time.
- **Provider credentials** stay in the backend only.

### 8.2 AI Credit Metering `[Added v1.1]`

- **What consumes credits:** resume analysis (1 per analysis), AI mock interview (1 per started session up to 20 minutes, +1 per extra 20 minutes), skill-gap report (0.5), voice transcription (0.25 per minute). Questions served from the fallback bank and rule-based scoring cost nothing.
- **Limits:** credits per institution per billing period (from the plan); optional per-student monthly cap set by the institution (default 10); rate limit of 5 AI requests per minute per user.
- **Metering:** each AI call writes `ai_usage_logs` (tokens, cost, feature, user, institution); credits are debited in `tenant_usage` when the feature completes, refunded if it fails.
- **When exhausted:** new AI sessions and analyses are refused with a clear message ("Your institution's AI credits for this period are used up"); sessions in progress finish; admins are notified at 80% and 100%; practice interviews fall back to the question bank only if the institution enables "fallback when exhausted".

## 9. Career Readiness Engine

A configurable readiness model can combine resume quality, aptitude, technical assessments, coding, communication/interview performance, projects and certifications.

| Dimension | Example Signal |
|---|---|
| Resume | Completeness, structure, relevance, keywords |
| Aptitude | Accuracy, speed, topic performance |
| Technical | Topic-level assessment performance |
| Coding | Test-case success, quality and efficiency |
| Communication | Interview response quality and delivery signals |
| Interview | Technical/HR interview evaluation |
| Projects | Project relevance and depth |
| Skills | Target-role skill coverage |

The exact formula should be configurable by product administrators and should avoid presenting a single score as an objective measure of employability.

`[Added v1.1]` Weights are configured per institution (`readiness_models`, versioned; platform default otherwise). Dimensions with no data are shown as "not measured yet" and excluded from the weighted average rather than counted as zero. Scores are recalculated by a queued job after each relevant event and kept as history.

## 10. Job Matching & Eligibility

Eligibility is deterministic and rule-based; matching can be probabilistic/AI-assisted.

Example eligibility rule: CGPA ≥ 7.0 AND backlog count = 0 AND department ∈ {CSE, IT} AND batch = 2027.

Example match output: Match percentage, satisfied requirements, missing skills and recommended preparation.

`[Added v1.1]` **Rule fields and operators.** `cgpa` (≥, ≤), `active_backlogs` (≤, =), `backlog_history` (≤), `attendance_percentage` (≥), `department` (in, not in), `batch` (in), `year` (in), `class_10_score` / `class_12_score` (≥, verified documents only), `gender` (in — only where legally required), `skill` (≥ level), `profile_completion` (≥), `not_placed` / `dream_offer_eligible` (policy). Rules on one job are combined with AND. The evaluator returns `eligible` plus each failed rule with expected and actual values, which the student sees. Eligibility is snapshotted on the application at apply time.

## 11. Recommended Technology Stack

| Layer | Recommended Technology | Purpose |
|---|---|---|
| Backend | Laravel | REST APIs, business logic, auth, queues, notifications. |
| API Auth | Laravel Sanctum | Token-based API authentication for the web app. |
| Web | React + TypeScript | **All roles:** super admin, institution admin, placement officer, faculty, student and recruiter interfaces. *(Changed v1.1)* |
| Database | MySQL (initial) / PostgreSQL | Relational application data. |
| Cache/Queue | Redis | Caching, queues, temporary state, rate limiting. |
| Storage | S3-compatible object storage | Resumes and documents (private, signed URLs). |
| AI | Provider-agnostic AI service layer | LLM, resume analysis, interview orchestration. |
| Speech | STT + TTS provider | Voice interview interaction in the browser. |
| Realtime | WebSocket/WebRTC where needed | Live interview experience. |
| CI/CD | GitHub Actions or equivalent | Automated testing and deployment. |
| Monitoring | Sentry + cloud metrics | Errors, performance and health. |

*(v1.1: the "Mobile — Flutter + Dart" row is removed. There is no mobile app.)*

## 12. System Architecture

Recommended logical architecture: **Web client (React SPA)** → API Gateway/Application → Laravel domain services → Database/Redis/Queue/Object Storage → AI Orchestration → external AI/speech services. *(Changed v1.1: "Web/Mobile clients" → web client.)*

Keep AI provider calls behind an internal adapter/service layer so models can be changed without rewriting business workflows.

## 13. Multi-Tenant SaaS Architecture

Every institution-owned record should be associated with a tenant/institution identifier. Tenant context must be established server-side and enforced through authorization/query scopes.

Alphagrew → Institution A / Institution B / Institution C → Departments → Students / Faculty / Placement data

Future SaaS layers: plans, subscriptions, usage limits, AI credits, billing, institution onboarding and platform analytics.

### 13.1 Tenant Implementation Rules `[Added v1.1]`

- Single database, shared schema, `institution_id` (NOT NULL, foreign key, indexed) on every institution-owned table; child rows that are never queried on their own may inherit through the parent.
- The tenant comes from the authenticated user only (middleware before route-model binding); request input can never set or change `institution_id`.
- Every tenant model uses a global scope; raw queries and validation rules (`exists`, `unique`) must filter by institution explicitly.
- Unique keys are per institution (department/course/subject codes, student email and registration number, designation slugs).
- Super Admin bypasses the scope and every such access is audit-logged. Recruiters access institution data only through approved `institution_company` links.
- Queued jobs carry the institution id and restore the tenant context.
- Every route group has cross-institution tests (other institution's id → 404).

## 14. Database Blueprint

| Domain | Core Tables |
|---|---|
| Identity | users, roles, permissions, role_user, devices, sessions |
| Institution | institutions, campuses, departments, courses, batches, semesters, academic_years |
| Students | students, student_profiles, student_academics, student_skills, student_projects, student_certifications, student_experience, student_documents |
| Placement | companies, company_contacts, jobs, placement_drives, eligibility_rules, applications, shortlists, offers, placements |
| Assessment | assessments, assessment_sections, questions, question_options, attempts, answers, results, result_details |
| AI | ai_resume_analyses, ai_interviews, ai_interview_questions, ai_interview_answers, ai_interview_evaluations, ai_recommendations, skill_gap_reports |
| Communication | notifications, announcements, notification_preferences |
| Audit | audit_logs, activity_logs |

*Implementation note (v1.1): the job table is named `job_postings` because Laravel reserves `jobs` for its queue; applications are `job_applications`.*

### 14.1 Database Additions `[Added v1.1]`

| Table | Purpose / justification |
|---|---|
| `invitations` | Single-use, expiring invites for students, staff and recruiters (§6 onboarding, §7.3). |
| `imports`, `import_errors` | Bulk import status and per-row error report (§6 bulk import). |
| `batches` | First-class batch (admission year + course) so eligibility and rollover can target it. |
| `campuses` | Institutions with more than one campus (§6 institution management). |
| `student_documents`, `document_verifications` | Uploaded documents and their `pending/verified/rejected` history with reason and verifier. |
| `profile_correction_requests` | Changes to locked academic data during a placement season. |
| `company_contacts`, `institution_company` | Recruiter contacts and per-institution recruiter approval (§7.3). |
| `drive_rounds` | Ordered rounds per job (aptitude, coding, GD, technical, HR) with venue/link and cut-off. |
| `round_results` | Per application per round outcome (cleared / not cleared / absent), score, feedback. |
| `interview_schedules` | Interview slots per application and round, panel, mode, confirmation. |
| `application_status_histories` | Append-only status history of each application with actor and note (state machine audit). |
| `offers`, `offer_responses` | Offer details and the student's response history (accept / decline / expired / revoked). |
| `placements` | Final placement record used by reports; replaces the text field on students. |
| `placement_policies`, `student_placement_flags` | Per-institution one-offer/dream-offer settings; opt-out and debarment per student. |
| `questions`, `question_options`, `question_test_cases`, `assessments`, `assessment_sections`, `assessment_questions`, `assessment_audiences`, `assessment_attempts`, `attempt_answers`, `attempt_events` | Assessment engine incl. coding test cases and proctoring logs (`attempt_events`). |
| `ai_prompt_versions` | Versioned prompt templates referenced by every AI output (§8.1). |
| `ai_usage_logs` | Tokens, cost, latency per AI call (exists). |
| `ai_score_overrides` | Human overrides of AI scores with reason (§8.1). |
| `consents` | Consent text version accepted per user and feature (§8.1). |
| `readiness_models` | Per-institution readiness weights, versioned (§9). |
| `plans`, `subscriptions`, `tenant_usage` | SaaS plans, institution subscriptions, metered usage and AI credits (§8.2, §7.5). |
| `notification_preferences` | Per-user channel preferences (§6 notification matrix). |
| `audit_logs` | Append-only admin/placement/super-admin actions with before/after values. |
| `devices` | Active sessions per user for device awareness and revocation. |
| `exports` | Asynchronous export jobs and their temporary files. |

## 15. API Specification Blueprint

| Area | Example Endpoints |
|---|---|
| Auth | POST /api/v1/auth/login, POST /api/v1/auth/logout, POST /api/v1/auth/forgot-password |
| Students | GET/POST /api/v1/students, GET/PATCH /api/v1/students/{id} |
| Resumes | POST /api/v1/resumes, GET /api/v1/resumes/{id}, POST /api/v1/resumes/{id}/analyze |
| Jobs | GET/POST /api/v1/jobs, PATCH /api/v1/jobs/{id} |
| Applications | POST /api/v1/jobs/{id}/apply, GET /api/v1/applications |
| Assessments | GET/POST /api/v1/assessments, POST /api/v1/assessments/{id}/attempts |
| Interviews | POST /api/v1/interviews, POST /api/v1/interviews/{id}/start, POST /api/v1/interviews/{id}/answer |
| AI | POST /api/v1/ai/resume-analysis, POST /api/v1/ai/interview-plan, POST /api/v1/ai/interview/evaluate |
| Analytics | GET /api/v1/analytics/student, GET /api/v1/analytics/placement, GET /api/v1/analytics/institution |

### 15.1 API Conventions `[Added v1.1]`

- **Base path and versioning:** `/api/v1`; breaking changes only in a new version; deprecated endpoints answer with a `Deprecation` header for one release.
- **Self-service paths:** a user's own data lives under `/me` (e.g. `/students/me/profile`); ids of other users' records are never needed for self-service.
- **Response envelope:** single resource `{ "data": {…} }`; list `{ "data": […], "meta": { "currentPage", "perPage", "total", "lastPage" } }`; action results may add `"message"`.
- **Errors:** `{ "message": "…", "code": "APPLICATION_DEADLINE_PASSED", "errors": { field: [..] } }`. Status codes: 400 malformed, 401 unauthenticated, 403 forbidden or business rule refused, 404 not found **or another institution's record**, 409 state conflict (e.g. already submitted), 422 validation or invalid transition, 429 rate limited, 503 dependency (AI) unavailable. No stack traces outside local development.
- **Pagination:** `page`, `per_page` (default 25, max 100).
- **Filtering and sorting:** `filter[field]=value`, `search=`, `sort=field,-other` (only documented fields).
- **JSON style:** camelCase keys, ISO-8601 timestamps with timezone, money as integer paise plus a display string.
- **Idempotency:** submit/apply/accept/finish endpoints accept an `Idempotency-Key` header; a repeated key within 24 h returns the original response. State machines also make repeats safe (applying twice returns the existing application).
- **Files:** uploads as multipart; downloads only through short-lived signed URLs.
- **Async work:** returns 202 with a resource in a pending status; the client polls or receives a notification.

### 15.2 Endpoints to Add `[Added v1.1]`

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/email/verification-notification`, `GET /auth/email/verify/{id}/{hash}`, `GET /auth/sessions`, `DELETE /auth/sessions/{id}` |
| Invitations | `POST /invitations` (bulk), `GET /invitations/{token}` (public), `POST /invitations/{token}/accept` (public), `DELETE /invitations/{id}` |
| Super admin | `GET/POST /admin/institutions`, `PATCH /admin/institutions/{id}`, `POST /admin/institutions/{id}/suspend`, `POST /admin/institutions/{id}/reactivate`, `GET/POST/PATCH /admin/plans`, `GET /admin/usage`, `GET /admin/audit-logs` |
| Institution | `GET/PATCH /institution/settings`, `GET/POST/PATCH/DELETE /campuses`, `GET/POST/PATCH/DELETE /batches`, `POST /academic-years/{id}/rollover` (+ `/preview`), `GET/PUT /placement-policies` |
| Classes & academics admin | `GET/POST/PATCH/DELETE /classes`, `POST /classes/{id}/students`, `GET/POST/DELETE /subject-allocations`, `GET/POST/PATCH/DELETE /timetables`, `GET/POST/PATCH/DELETE /exam-types`, `GET/POST/PATCH/DELETE /exams`, `GET/POST/PATCH /fee-structures`, `POST /fee-structures/{id}/generate-dues`, `POST /student-fees/{id}/payments` |
| Students admin | `POST /imports` (multipart), `GET /imports/{id}`, `GET /imports/{id}/errors` (download), `POST /imports/{id}/commit`, `POST /students/{id}/approve` |
| Documents | `GET/POST /students/me/documents`, `DELETE /students/me/documents/{id}`, `GET /documents/pending`, `POST /documents/{id}/verify` |
| Profile corrections | `POST /students/me/correction-requests`, `GET /correction-requests`, `POST /correction-requests/{id}/decide` |
| Placement | `GET/POST/PATCH /companies/{id}/contacts`, `GET/POST/PATCH/DELETE /placement-drives`, `POST /placement-drives/{id}/publish`, `POST /placement-drives/{id}/close`, `GET/POST/PATCH/DELETE /placement-drives/{id}/job-postings`, `PUT /job-postings/{id}/eligibility-rules`, `GET /job-postings/{id}/eligible-students`, `GET /job-postings/{id}/applications`, `PATCH /job-applications/{id}/status`, `GET/POST /job-postings/{id}/rounds`, `POST /drive-rounds/{id}/results`, `POST /drive-rounds/{id}/slots`, `POST /job-applications/{id}/offers`, `POST /offers/{id}/revoke`, `GET /placements`, `PATCH /students/{id}/placement-flags` |
| Student placement | `GET /students/me/jobs`, `GET /students/me/jobs/{id}`, `POST /job-postings/{id}/applications`, `GET /students/me/applications`, `GET /students/me/applications/{id}`, `POST /students/me/applications/{id}/withdraw`, `GET /students/me/interview-slots`, `POST /interview-slots/{id}/confirm`, `GET /students/me/offers`, `POST /students/me/offers/{id}/accept`, `POST /students/me/offers/{id}/decline`, `POST /students/me/placement-opt-out` |
| Assessments | `GET/POST/PATCH/DELETE /questions`, `POST /questions/import`, `GET/POST/PATCH/DELETE /assessments`, `POST /assessments/{id}/publish`, `GET /students/me/assessments`, `POST /assessments/{id}/attempts`, `GET /attempts/{id}`, `PUT /attempts/{id}/answers/{question}`, `POST /attempts/{id}/events` (proctoring), `POST /attempts/{id}/submit`, `GET /attempts/{id}/result`, `GET /assessments/{id}/attempts` (faculty), `POST /attempt-answers/{id}/evaluate`, `POST /assessments/{id}/results/publish`, `GET /assessments/{id}/weak-areas` |
| Resume | `GET /students/me/resumes/{id}/parsed`, `PUT /students/me/resumes/{id}/parsed` (corrections), `POST /students/me/resumes/{id}/import-to-profile` |
| Matching & skill gap | `GET /students/me/jobs/{id}/match`, `POST /students/me/skill-gap` (target role or job), `GET /students/me/skill-gap/{id}` |
| AI governance | `GET/POST /admin/ai/prompt-versions`, `POST /ai-scores/{id}/override`, `GET/PUT /readiness-models`, `DELETE /students/me/interviews/{id}` (practice data deletion) |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PUT /notification-preferences` (replace the sample `/student/notifications/*`) |
| Recruiter | `POST /recruiters/register`, `POST /recruiters/me/institution-requests`, `POST /recruiter-requests/{id}/decide`, `GET /recruiters/me/drives`, `GET /recruiters/me/candidates`, `GET /recruiters/me/candidates/{id}` |
| Reports | `POST /exports` (type, filters), `GET /exports/{id}`, `GET /analytics/student/{id}`, `GET /analytics/placement`, `GET /analytics/institution`, `GET /analytics/department/{id}` |
| Audit | `GET /audit-logs` (institution scope) |

## 16. Recommended Repository Structure

```
alphagrew/
├── backend/          # Laravel API/domain (incl. AI service layer under app/Services/Ai)
├── frontend/         # React + TypeScript web app for ALL roles
├── documentation/    # PRD, SRS, API, ERD, prompts, audit
└── infrastructure/   # deployment/configuration
```

*(v1.1: `admin-web/`, `recruiter-web/` and `student-app/` merge into one `frontend/` app with per-role portals; `ai-services/` stays inside the backend unless separated for scale. The Flutter structure section is removed.)*

**Laravel structure:** `app/Actions, DTOs, Enums, Events, Exceptions, Http/Controllers, Http/Requests, Http/Resources, Jobs, Listeners, Models, Notifications, Policies, Repositories, Services (incl. Ai/), Support, Traits, ValueObjects`.

### 16.1 Frontend Conventions `[Added v1.1]`

- **Folder structure:** `src/app` (router, providers), `src/portals/{super-admin,admin,placement,faculty,student,recruiter}` (pages per role), `src/features/{feature}` (components, hooks, API calls per feature, shared across portals), `src/components/ui` (shared component library), `src/lib` (API client, auth, formatting), `src/types`.
- **Routing:** URL-based routes per portal (React Router); every page has a URL; lazy-loaded portals for code splitting.
- **Route guards:** a guard per route checks the role and the required permission from `/auth/me`; unauthorised → 403 page; unauthenticated → login with return URL. The API remains the authority.
- **Shared component library:** one design system (`components/ui`) for buttons, inputs, selects, dialogs, tables, tabs, toasts, empty states, skeletons; accessible by default (labels, focus, keyboard).
- **API client:** one typed client generated from or matching the backend Resources; handles auth header, 401 (logout), 403, 422 (field errors), 429 and 5xx uniformly; no `any` in response types.
- **State management:** server state with a query cache (e.g. TanStack Query: caching, retries, invalidation after mutations); local UI state with React state; no copying the whole dataset into `localStorage`.
- **Forms and validation:** a form library with schema validation (e.g. React Hook Form + Zod) mirroring server rules; server 422 errors mapped onto fields.
- **States:** every data view has loading (skeleton), empty (with next action), error (with retry) states.
- **Auth storage:** tokens not readable by page scripts where possible (httpOnly cookie in SPA mode) or short-lived; never in URLs.
- **Testing:** component tests for shared UI; end-to-end tests (e.g. Playwright) for the critical journeys (login per role, apply, assessment attempt, AI interview, offer response).
- **Demo data:** only in development builds; production builds fail without an API base URL.

## 17. UI/UX Screen Inventory

| Application | Key Screens |
|---|---|
| Super Admin | Login, dashboard, institutions, plans, usage, system settings, audit logs |
| Institution Admin | Dashboard, institution settings, departments, courses, batches, students, faculty, `[Added v1.1]` imports, document verification, placement policies, academic-year rollover |
| Placement Officer | Dashboard, companies, jobs, drives, eligibility, applications, interviews, placements, reports, `[Added v1.1]` recruiter approvals, offers |
| Faculty/Trainer | Dashboard, students, assessments, results, training, `[Added v1.1]` question bank, evaluation queue, attendance, marks |
| Student (web) | Home, profile, resume, skills, assessments, jobs, applications, interview, readiness, recommendations, notifications, `[Added v1.1]` documents, offers |
| Recruiter | Company, jobs, candidates, filters, assessments, interviews, selections, `[Added v1.1]` institution access requests |
| AI Interview | Setup, consent/instructions, interview room, live question/answer state, completion, report |

All screens are responsive web pages (desktop, tablet and phone widths). *(Changed v1.1)*

## 18. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Common API requests should be optimized for responsive interactive use; heavy jobs run asynchronously. `[Added v1.1]` p95 < 500 ms for list/detail endpoints at 1,000 concurrent users; initial JS bundle < 300 kB gzip per portal. |
| Scalability | Architecture should support increasing institutions, students and concurrent assessments/interviews. |
| Security | HTTPS, validation, RBAC, tenant isolation, secure uploads, rate limiting, secrets management. |
| Availability | Production monitoring, backups and documented recovery procedures. `[Added v1.1]` Daily database backups kept 30 days, restore tested monthly; RPO 24 h, RTO 4 h. |
| Accessibility | Keyboard support, readable contrast, responsive layouts and accessible form controls. `[Added v1.1]` WCAG 2.1 AA for student and staff portals. |
| Observability | Centralized error tracking, logs, metrics and queue monitoring. |
| Maintainability | Modular services, tests, API versioning and documentation. |

## 19. Security & Privacy

- Enforce institution/tenant isolation on every relevant data path.
- Use least-privilege roles and policies.
- Validate file types, size and content before storage.
- Use private object storage for sensitive documents.
- Encrypt data in transit and protect sensitive secrets.
- Maintain audit logs for administrative and placement actions.
- Apply API rate limits and abuse controls.
- Define data retention/deletion rules for resumes, interviews and AI transcripts.
- Obtain appropriate consent for voice/video processing and clearly communicate how AI outputs are used.
- Do not expose raw AI provider credentials to clients.
- `[Added v1.1]` No debug output, demo accounts or demo-reset endpoints in production configuration.
- `[Added v1.1]` API tokens expire (§6) and are not stored where page scripts can read them, where the deployment allows.

## 20. AI Prompt Architecture

Prompts should be versioned templates, not hard-coded strings scattered across controllers.

Example context: system role + candidate profile + parsed resume + target role + interview mode + difficulty + previous questions + previous answer + required output schema.

Store prompt version, model, parameters, input metadata and evaluation outcome where appropriate for debugging and quality improvement. `[Added v1.1]` Prompts live in `ai_prompt_versions`; outputs are validated against a JSON schema and rejected if invalid.

## 21. Development Methodology

Use Agile delivery with short iterations. Each feature follows: Requirement → UI/UX → Database/API design → Development → Unit/Feature tests → QA → Review → Staging → Production.

Definition of Done: UI complete, API complete, validation, authorization, error/empty/loading states, tests, security review, documentation and deployment readiness. `[Added v1.1]` Plus: tenant-isolation test for every new route group, and the traceability matrix updated.

## 22. Project Phases & Estimated Timeline

| Phase | Name | Duration | Major Deliverables |
|---|---|---|---|
| 0 | Discovery & Product Planning | 1–2 weeks | PRD, SRS, scope, personas, architecture, ERD, API plan |
| 1 | UI/UX & Design System | 2–3 weeks | Figma flows, dashboards, **responsive web UX**, design system *(changed v1.1)* |
| 2 | Core Infrastructure | 1–2 weeks | Auth, roles, permissions, tenant foundation, API skeleton |
| 3 | Institution & Student Management | 2–3 weeks | Institution, department, course, batch, student, faculty |
| 4 | Placement Management | 3–4 weeks | Companies, jobs, eligibility, applications, interviews, placement |
| 5 | Assessment Engine | 3–4 weeks | Question bank, tests, attempts, results, analytics |
| 6 | Career Development | 2–3 weeks | Skills, projects, certifications, readiness foundation |
| 7 | Resume Intelligence | 2–3 weeks | Upload, parsing, AI analysis, job matching |
| 8 | AI Interview MVP | 4–6 weeks | Resume-aware text/voice interview, evaluation, report |
| 9 | Face-to-Face AI Interview | 4–6 weeks | Realtime voice, avatar, adaptive interview experience |
| 10 | Analytics & Reporting | 2–3 weeks | Institution, department, student, placement analytics |
| 11 | Communication | 1–2 weeks | **Email, SMS and web push** as required, announcements, reminders *(changed v1.1)* |
| 12 | Recruiter Portal | 2–3 weeks | Recruiter onboarding, jobs, candidates, interviews |
| 13 | SaaS & Billing Foundation | 3–4 weeks | Tenant onboarding, plans, usage, AI credits, billing-ready |
| 14 | Security, QA & Production Launch | 2–3 weeks | Load/security testing, monitoring, backup, deployment, training |

Practical MVP calendar estimate: approximately 12–18 weeks when scope is controlled and parallelized. Full V1: approximately 7–10 months. Advanced SaaS + AI platform: approximately 10–15 months. These are planning ranges, not fixed commitments.

## 23. Recommended MVP Scope

- Authentication and role management.
- Institution/departments/courses/batches.
- Student and faculty management.
- Company/job/placement drive management.
- Eligibility engine.
- Applications and placement workflow.
- Basic assessment engine.
- Resume upload and basic AI analysis.
- Student dashboard.
- Placement dashboard.
- Notifications.

After MVP validation, prioritize AI Interviewer as the flagship differentiator.

## 24. Release Roadmap

| Release | Focus | Key Capabilities |
|---|---|---|
| V1 | Campus + Placement | Students, institutions, companies, jobs, eligibility, applications, assessments, placement |
| V2 | Career Intelligence | Resume AI, skill gaps, job matching, readiness analytics |
| V3 | AI Interview Platform | Resume-aware AI interviewer, voice, adaptive questioning, evaluation |
| V4 | AI Career Coach | Personalized roadmap, AI mentor, recommendations, continuous readiness |
| V5 | SaaS Ecosystem | Multi-tenant scale, subscriptions, recruiter ecosystem, training institutes |

## 25. QA & Testing Strategy

- Unit tests for domain logic and services.
- Feature/API tests for complete workflows.
- Authorization and tenant-isolation tests.
- UI regression tests for critical screens.
- **Browser and screen-size compatibility testing** (current Chrome, Edge, Firefox, Safari; phone, tablet and desktop widths). *(Changed v1.1: replaces mobile device and OS testing.)*
- Assessment concurrency/load tests.
- AI quality tests for relevance, grounding, consistency and latency.
- Security tests for file uploads, authorization, rate limits and common web vulnerabilities.
- Production smoke tests and rollback verification.
- `[Added v1.1]` Accessibility checks (axe) on every portal in CI.

## 26. DevOps & Deployment

Local → Development → Staging → Production.

- Git-based feature branches and pull requests.
- Automated linting/tests in CI.
- Database migrations under version control.
- Environment-specific secrets.
- Staging acceptance before production.
- Automated backups and tested restoration.
- Monitoring for API, database, queues and AI services.
- `[Added v1.1]` Queue workers under a supervisor and the Laravel scheduler (cron) in every environment.

## 27. Cost & Capacity Planning

Recurring cost centers: compute, database, object storage, AI inference, speech services, email/SMS, monitoring and CDN. AI interviews should be metered because they create variable per-session costs.

- Cache reusable analysis results.
- Do expensive AI work asynchronously.
- Use model tiers by task complexity.
- Track tokens/AI credits per institution.
- Set per-user and per-tenant rate/usage limits.
- Store structured resume analysis so unchanged resumes are not repeatedly processed.

## 28. Product Differentiation

Alphagrew should be positioned as an AI-powered Campus & Career Readiness Platform rather than only a college administration system.

Its product loop is: Manage → Measure → Identify Gaps → Practice → Interview → Match → Place → Improve.

## 29. Future Scope

- AI career coach.
- AI resume builder and cover-letter generation.
- AI LinkedIn/profile analyzer.
- AI coding coach.
- Group discussion simulator.
- Presentation evaluator.
- Alumni network.
- Gamification and achievements.
- Recruiter ecosystem.
- Training institute mode.
- Learning-content integrations.
- Advanced institution benchmarking.
- AI-assisted placement insights.

## 30. Acceptance Criteria — Product Level

1. An institution administrator can configure an institution, departments, courses and batches.
2. A student can create a complete academic/career profile and upload a resume.
3. A placement officer can create a job and define eligibility rules.
4. The system can produce an eligible student list from deterministic rules.
5. A student can apply to an eligible job and track application status.
6. An administrator/faculty member can create an assessment and view results.
7. A student can complete an assessment and receive a result.
8. The system can parse and store structured resume information.
9. AI resume analysis can generate explainable improvement suggestions.
10. A student can start an AI mock interview for a selected role.
11. The interview can use resume/profile context to generate relevant questions.
12. Completed interviews produce a structured report and recommendations.
13. Tenant isolation prevents cross-institution access.
14. Critical workflows are covered by automated tests and production monitoring.

`[Added v1.1]`

15. Every role completes its journey (§7) in the web app; there is no mobile dependency.
16. A super admin can create an institution, assign a plan, invite its first admin, and suspend/reactivate it (suspension ends its users' sessions).
17. A user can reset a forgotten password and must verify email before applying to jobs.
18. Login, registration, upload and AI endpoints are rate limited (429 beyond the limits in §6/§8.2).
19. An admin can bulk import students from CSV/XLSX, see per-row errors, and import valid rows.
20. Students can join only via a valid invitation or an approved self-registration.
21. Profile completion % is shown and an institution minimum can block applications.
22. Documents move pending → verified/rejected with reason; only verified scores count in eligibility.
23. Academic-year rollover advances students and marks final-year batches as alumni, with preview and undo.
24. CGPA and backlogs used by eligibility are derived from published results.
25. Each state machine in §7.8 rejects invalid transitions with 422 and records history.
26. One-offer, dream-offer, offer deadline, opt-out and debarment policies are enforced as configured.
27. A student sees, for every job, whether they are eligible and which rule fails.
28. Applications cannot be created after the deadline or by ineligible students.
29. A placement officer can run rounds, schedule interviews, record results, issue offers and record placements.
30. A student can accept or decline an offer before its deadline; unanswered offers expire.
31. Assessments support sections, randomization, negative marking, re-attempt rules, timed submission and tab-switch logging.
32. Coding answers run only in an isolated sandbox.
33. Faculty can evaluate subjective/coding answers and publish results; students see weak areas.
34. Recruiters see only approved institutions' drives and only candidate fields students made visible.
35. Every notification in the §6 matrix is delivered on its channels and respects preferences.
36. Every AI output records prompt version, model and rubric; reports state their scorer.
37. Faculty/officers can override an AI score with a reason; the original is kept.
38. AI credits are metered per institution; exhausted credits block new AI work with a clear message.
39. Transcripts and audio are purged according to the retention rules.
40. Every list endpoint is paginated and follows the §15.1 envelope and error format.
41. Every page has a URL, a route guard, and loading/empty/error states.
42. Student and staff portals meet WCAG 2.1 AA (axe has no serious issues).
43. Production configuration has no debug output, demo accounts or demo reset.
44. CI runs backend tests, tenant-isolation tests, type checks, frontend tests and the build on every pull request.

## 31. Final Product Definition

Alphagrew is an AI-powered Campus & Career Readiness Platform that connects student management, assessments, skill development, resume intelligence, AI interviews and placement management into one unified ecosystem, delivered as one web application for every role.

The recommended build strategy is modular: first establish the campus and placement foundation, then add career intelligence, then the AI interviewer, and finally multi-tenant SaaS and the broader recruiter/career ecosystem.

## 32. Implementation Priority Matrix

| Priority | Modules | Reason |
|---|---|---|
| P0 — Must Have | Auth, Tenant, Institution, Student, Placement, Eligibility, Applications, `[Added v1.1]` security hardening, Campus Academics results (CGPA/backlogs) | Core product foundation |
| P1 — High | Assessments, Resume, Analytics, Notifications | MVP usability and measurable value |
| P2 — Strategic | Resume AI, Job Matching, Skill Gap, AI Interview MVP | Product differentiation |
| P3 — Advanced | Realtime Face-to-Face AI, Avatar, Recruiter Portal, SaaS Billing | Scale and premium capabilities |
| P4 — Future | AI Coach, Alumni, Gamification, Ecosystem integrations | Expansion after market validation |

## 33. Developer Handoff Checklist

- Approve final PRD/SRS and scope.
- Approve Figma flows and design system.
- Finalize database ERD and migrations.
- Finalize API contracts and error format.
- Create repositories and branch strategy.
- Set up environments and secrets.
- Implement authentication/RBAC/tenant isolation first.
- Build core modules in vertical slices.
- Add automated tests with every module.
- Create staging environment before AI integration.
- Create AI provider abstraction and prompt versioning.
- Define AI evaluation dataset and quality criteria.
- Load-test assessments and interview concurrency.
- Complete security/privacy review before institutional pilot.
- Run pilot with one institution before broad SaaS rollout.
- `[Added v1.1]` Keep `documentation/audit/02-gap-analysis.md` (traceability matrix) current with every slice.
- `[Added v1.1]` Remove demo data, demo accounts and debug settings from production configuration.
- `[Added v1.1]` Commit all work in progress before each review (no uncommitted feature code).
