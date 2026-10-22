# 02 — Gap Analysis (PRD ↔ Code Traceability)

| Item | Value |
|---|---|
| Baseline | Master Product Documentation v1.0 (Sept 2026), with mobile scope removed |
| Code snapshot | `HEAD 17c5de5` + uncommitted frontend, 22 October 2026 (see `01-code-inventory.md`) |
| Evidence | Code reading, 120 passing backend tests, live HTTP runs against a seeded API, and a scripted frontend ↔ route contract check |

Legend: ✅ Complete · 🟡 Partial · 🔴 Missing · ⚠️ Broken / inconsistent. Each gap has an ID (e.g. `AUTH-2`) used by `04-implementation-plan.md`.

## 1. Completion by module

| # | Module | Status | Est. completion | Main gaps |
|---|---|---|---|---|
| 1 | Auth & RBAC | 🟡 | 60% | Password reset, email verification, rate limits, audit log, token storage |
| 2 | Multi-tenancy | ⚠️ | 80% | Confirmed leak in placement applications; 5 unscoped models; Spatie teams deferred |
| 3 | Institution management | 🟡 | 45% | No institution/campus/batch management, no settings/branding, grading UI unused, no placement rules |
| 4 | Student & faculty management | 🟡 | 55% | No bulk import, no documents, no recruiter-visible profile, no faculty assignment, staff management stubbed |
| 5 | Placement | 🟡 | 30% | Company = job = drive; no contacts, rounds, shortlists, interviews, offers, placements |
| 6 | Eligibility engine | 🔴 | 10% | Only "department ∈ list"; rules table exists without evaluator or API |
| 7 | Assessment engine | 🔴 | 0% | Nothing built |
| 8 | Resume intelligence | 🟡 | 70% | No parse review/correction, no job comparison, analysis untested with a live provider |
| 9 | Job matching | 🔴 | 0% | No match %, no student job feed |
| 10 | AI interviewer | 🟡 | 75% | Text works end to end; voice/STT not wired in UI; no credits, no human override, no retention job |
| 11 | Career readiness | 🟡 | 60% | Fixed weights in code; no assessment/coding dimensions (no assessments) |
| 12 | Notifications & announcements | 🟡 | 25% | Announcements real; notifications are sample data; no email/SMS/preferences |
| 13 | Analytics & reporting | 🟡 | 25% | Summary + placement stats real; HOD/department reports stubbed; no exports |
| 14 | Recruiter portal | 🔴 | 5% | Role exists, login blocked by design |
| 15 | Super admin / SaaS | 🔴 | 10% | Institutions table + super-admin command only |
| 16 | Non-functional | 🟡 | 35% | No rate limits, CI, monitoring, backups; debug defaults; no code splitting; a11y gaps |

Overall weighted estimate: **≈ 38%** of the PRD (v1.1 scope) is implemented end to end.

## 2. Traceability matrix

### 1. Auth & RBAC

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-1 | Login / logout / me | `users`, `personal_access_tokens` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | `AuthController`, `LoginRequest` | `CampusLogin.tsx` | all | `CampusApiTest`, `RoleModelTest` | ✅ | Login also refuses recruiters and inactive institutions |
| AUTH-2 | Password reset | `password_reset_tokens` (unused) | — | — | — | all | — | 🔴 | Add forgot/reset endpoints + mail + screens |
| AUTH-3 | Registration | `users`, `students` | `POST /auth/register` | `RegisterRequest`, `CreateStudentAction` | No registration screen (API function unused) | student | `RoleModelTest`, `TenantIsolationTest` | 🟡 | Needs UI, invite links, email verification |
| AUTH-4 | Token/session management, device awareness | `personal_access_tokens`, `sessions` | — | Token name = user agent | — | all | — | 🔴 | No device list / revoke, no token expiry policy enforced |
| AUTH-5 | Role-based permissions | Spatie tables | `permission:` middleware on all routes; `/permissions/*` | `CampusPermission`, observers | `usePermissions`, `RoleBasedSidebar` | all | `PermissionEnforcementTest`, `RoleModelTest` | ✅ | |
| AUTH-6 | Audit logging for admin actions | `activity_logs` | — | `LogsActivity` trait (create/update/delete) | — | admin | — | 🟡 | No append-only audit log with before/after, no viewer, super-admin actions not logged |
| AUTH-7 | Rate limiting / abuse controls | — | none have `throttle` | — | — | all | — | 🔴 | Login, register, AI and upload endpoints unthrottled |

### 2. Multi-tenancy

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| TEN-1 | `institution_id` on tenant-owned tables | 44 tables carry it (NOT NULL except users, logs) | — | Migration `2026_10_20_000002` | — | — | `TenantIsolationTest` | 🟡 | Missing on `company_applications`, `placement_rounds`, `placement_results`, `revaluation_requests`, `marks` |
| TEN-2 | Server-side tenant resolution | — | all authenticated routes | `SetTenant` (prioritised before `SubstituteBindings`) | — | — | `TenantIsolationTest` | ✅ | |
| TEN-3 | Query scopes / policies | — | — | `BelongsToInstitution`, `TenantRule` | — | — | `TenantIsolationTest`, `MarksTenantIsolationTest`, `AiInterviewTenantIsolationTest` | ⚠️ | **Confirmed leak**: `GET /staff/placement/applications` (and `/placement/applications`) lists every institution's applications (`PlacementController@getApplications` queries unscoped `CompanyApplication`) |
| TEN-4 | Per-institution roles | — | — | Per-user permission sync | — | — | — | 🟡 | Spatie teams deferred; fine while one user = one institution |

### 3. Institution management

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| INST-1 | Create/configure institutions | `institutions` | — | `alphagrew:super-admin` only | — | super admin | — | 🔴 | No CRUD, no onboarding |
| INST-2 | Campuses | — | — | — | — | admin | — | 🔴 | Table missing |
| INST-3 | Departments, courses, semesters, academic years | ✅ tables | full CRUD | Older-style controllers | `DepartmentsModule`, `CoursesModule`, `SubjectsModule`, `AcademicYearModule` | admin | `DepartmentStatsTest` | ✅ | Validation inline; tenant-scoped rules applied |
| INST-4 | Batches | `classes.batch` (text) | — | — | `ClassesModule` (local state only) | admin | — | 🔴 | Batches needed for eligibility |
| INST-5 | Grading rules | `grade_rules`, `mark_schemes` | CRUD | `Actions/Marks/*` | `MarksModule` (grade-rule save functions unused) | admin | `MarkEntryTest` | 🟡 | Admin UI for grade rules/mark schemes not wired |
| INST-6 | Placement rules (one-offer etc.) | — | — | — | — | admin | — | 🔴 | Policy undefined (added in PRD v1.1) |
| INST-7 | Branding & communication settings | `institutions.settings` (unused) | — | — | `SystemSettingsModule` (local only) | admin | — | 🔴 | |
| INST-8 | Classes, timetable, fees admin | tables exist | read-only student APIs | — | `ClassesModule`, `TimetableModule`, `FeesModule` (local state) | admin | — | 🔴 | Screens are front-end only |

### 4. Student & faculty management

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| STU-1 | Create students | `students`, `users` | `POST/PUT/DELETE /students`, paginated `GET /students` | `CreateStudentAction`, `StudentPolicy` | Students tab (`CampusWorkspace`) | admin, staff | `CampusApiTest` | ✅ | |
| STU-2 | Bulk import (CSV/Excel) | — | — | — | — | admin | — | 🔴 | Needs import pipeline + error report |
| STU-3 | Profile, projects, certifications, experience | `student_profiles`, `student_projects`, `student_certifications`, `student_experience` | `/students/me/*` | Controllers + `ProfileCompleteness` | `StudentCareerProfile` | student | `StudentProfileTest` | ✅ | |
| STU-4 | Academic history + derived CGPA/backlogs | `student_academics`, `student_academic_summaries` | `/students/me/academics`, `/education`, staff verify/recalculate | `AcademicSummaryCalculator`, `RecalculateAcademicSummary` job | `StudentCareerProfile` | student, staff | `StudentAcademicsTest`, `AcademicSummaryCalculationTest` | 🟡 | Staff verification has API but no screen |
| STU-5 | Skills | `skills`, `student_skills` | `/skills`, `/students/me/skills` | `SkillResolver` | `StudentCareerProfile` | student | `StudentProfileTest` | ✅ | |
| STU-6 | Documents upload & verification | — | — | — | — | student, staff | — | 🔴 | `student_documents`, `document_verifications` |
| STU-7 | Recruiter-visible fields | `student_profiles.visibility` | — | Visibility stored | Visibility toggles | student | `StudentProfileTest` | 🟡 | No recruiter resource consumes it |
| STU-8 | Faculty / trainers / placement officers | `users` + designations | `/staff` CRUD | `SaveStaffMemberAction` | Staff tab | admin | `RoleModelTest`, `CampusResourcesTest` | 🟡 | HOD staff management, workload, class assignment are stubs |

### 5. Placement

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| PLC-1 | Companies | `companies` (also holds job + drive fields) | `/companies` CRUD | `CompanyController` | Placement tab | admin, officer | `CampusResourcesTest` | 🟡 | Company row = job = drive |
| PLC-2 | Company contacts | — | — | — | — | officer | — | 🔴 | |
| PLC-3 | Jobs & drives | `placement_drives`, `job_postings` | `/staff/placement/drives` (reads/writes **companies**) | `PlacementController` | `PlacementOfficerModule` | officer | `PlacementControllerTest` | ⚠️ | New tables populated only by `LegacyCompanyImporter`; API still writes the legacy model — two sources of truth |
| PLC-4 | Applications with status | `job_applications`, `job_application_events` (unused), `company_applications` | `POST /companies/{id}/apply`, `GET /staff/placement/applications` | `ApplyToCompanyAction` | Drive list "Apply" | student, officer | `CampusResourcesTest` | ⚠️ | Applications have no status; officer list leaks across tenants (TEN-3) |
| PLC-5 | Shortlists, interviews, rounds | `placement_rounds`, `placement_results` (unused) | — | — | — | officer | — | 🔴 | |
| PLC-6 | Offers & placement records | — | — | — | — | officer, student | — | 🔴 | "Placed" is text on `students` |
| PLC-7 | Placement reports / export | — | `/placement/report` (unused) | `PlacementController@exportReport` | — | officer | — | 🟡 | Not wired in UI |

### 6. Eligibility engine

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| ELG-1 | Deterministic rules (CGPA, backlogs, department, batch, skills) | `eligibility_rules` | — | Only `ApplyToCompanyAction` department check | — | officer | — | 🔴 | Build `EligibilityEvaluator` reading `student_academic_summaries`, `student_academics`, `student_skills` |
| ELG-2 | Auto-filter eligible students | — | — | — | — | officer | — | 🔴 | |

### 7. Assessment engine

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| ASM-1 | Question bank (all types incl. coding) | — | — | — | — | faculty | — | 🔴 | |
| ASM-2 | Timed attempts, auto-evaluation, results | — | — | — | — | student | — | 🔴 | |
| ASM-3 | Weak-area analytics | — | — | — | — | faculty, student | — | 🔴 | |
| ASM-4 | Exam coordinator module | — | `/staff/exam/*` | Stub | `ExamCoordinatorModule` (prototype notice) | staff | — | ⚠️ | Academic exam CRUD also missing (affects marks pipeline) |

### 8. Resume intelligence

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| RES-1 | Upload PDF/DOC/DOCX, validation, private storage | `resumes` | `/students/me/resumes` (+ signed download) | `ResumeController`, `ParseResumeJob` | `StudentAiInterviewView` | student | `ResumeParserTest` | ✅ | Live: upload 201, unreadable file fails with a clear message |
| RES-2 | Structured extraction | `resumes.parsed_*` | — | `ResumeParser` | — | student | `ResumeParserTest` | 🟡 | No screen to review/correct parsed data |
| RES-3 | Quality analysis | `ai_resume_analyses` | `/resumes/{id}/analysis` | `AnalyzeResumeJob` via `AiClient` | `StudentAiInterviewView` | student | `AiClientTest` | 🟡 | Not verified with a real provider |
| RES-4 | Compare to job requirements | — | — | — | — | student | — | 🔴 | Depends on job postings |

### 9. Job matching

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| JOB-1 | Match %, satisfied/missing requirements | — | — | — | — | student | — | 🔴 | `/students/me/jobs` returns 404 |
| JOB-2 | Recommended preparation | `ai_recommendations` | `/students/me/recommendations` | from interviews only | `StudentAiInterviewView` | student | `ReadinessIntegrationTest` | 🟡 | Not job-driven |

### 10. AI interviewer

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| AI-1 | Setup, consent, plan, questions, follow-ups, adaptive difficulty | `ai_interviews`, `ai_interview_turns` | `/students/me/interviews`, `/interviews/{id}/start`, `/turns/{turn}/answer`, `/finish` | `InterviewPlanner`, `InterviewConductor`, `AdaptiveDifficulty`, `QuestionBank` fallback | `StudentAiInterviewView` (**uncommitted**) | student | `InterviewSessionLifecycleTest`, `AdaptiveInterviewEngineTest`, `TurnFollowUpTest` | ✅ | Live run passed without an AI key (question bank) |
| AI-2 | Evaluation & report | `ai_interview_evaluations` (`rubric_version`, `model_name`) | `/evaluation`, `/report`, `/skill-gap` | `InterviewEvaluator` (AI or heuristic) | `StudentAiInterviewView` | student | `ReadinessIntegrationTest` | 🟡 | No human override; `/report` unused (UI uses `/evaluation`) |
| AI-3 | Voice (browser STT) | `ai_interview_turns.answer_audio_path` | config `transcription` | Partial | — | student | — | 🟡 | Not wired in UI |
| AI-4 | Timeout / resume handling | — | — | `interviews:close-idle` | — | system | `InterviewSessionLifecycleTest` | ✅ | Needs cron in deployment |
| AI-5 | Prompt versioning, usage metering, credits | `ai_usage_logs` | — | `AiClient` logs tokens/cost | — | system | `AiClientTest` | 🟡 | Prompts in code; no credit limits |
| AI-6 | Transcript retention | — | — | — | — | system | — | 🔴 | Policy + purge job missing |

### 11. Career readiness

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| RDY-1 | Weighted readiness score | `readiness_scores` | `/students/me/readiness-score`, `/readiness`, `/readiness/history` | `RecalculateReadinessJob` | `StudentAiInterviewView` | student | `ReadinessIntegrationTest` | 🟡 | Weights not configurable per institution; no assessment/coding inputs |

### 12. Notifications & announcements

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| NOT-1 | Announcements | `announcements` | CRUD | `AnnouncementController` | Announcements tab | all | `CampusResourcesTest` | ✅ | |
| NOT-2 | In-app notifications | `notifications` (empty) | `/student/notifications/*` | Stub | `StudentNotifications` | student | — | ⚠️ | Hardcoded; only `MarksRejected` notification class exists |
| NOT-3 | Email / SMS / preferences | — | preference routes (stub) | — | — | all | — | 🔴 | |

### 13. Analytics & reporting

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| RPT-1 | Institution summary | — | `/reports/summary` | `CampusDataService` | Admin dashboard | admin | `CampusResourcesTest` | ✅ | |
| RPT-2 | Placement funnel / statistics | — | `/staff/placement/statistics` | `PlacementController` | `PlacementOfficerModule` | officer | `PlacementControllerTest` | 🟡 | Based on legacy fields |
| RPT-3 | Department / HOD reports | — | `/staff/reports/*`, `/staff/department/*` | Stub | `HODReportsAnalytics`, `DepartmentOverview` | staff | — | ⚠️ | Sample data |
| RPT-4 | Exports | — | `/placement/report` | partial | — | admin, officer | — | 🔴 | No CSV/XLSX export in UI |

### 14. Recruiter portal

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| REC-1 | Register, verification, company profile, jobs, candidates, assess, interview, offer | — | — | Role + login refusal | `RecruiterDashboard` (unrendered, calls old prototype) | recruiter | `RoleModelTest` | 🔴 | P3 in PRD |

### 15. Super admin / SaaS

| ID | PRD requirement | DB tables | API endpoints | Backend logic | Frontend screens | Role(s) | Tests | Status | Gap notes |
|---|---|---|---|---|---|---|---|---|---|
| SAAS-1 | Institutions, plans, subscriptions, usage, AI credits, billing-ready | `institutions` only | — | — | Super admin sees admin menu | super admin | — | 🔴 | P3 in PRD |

### 16. Non-functional

| ID | PRD requirement | Evidence | Status | Gap notes |
|---|---|---|---|---|
| NFR-1 | Validation & secure uploads | Resume and photo uploads validate type/size; private disk; signed URLs | ✅ | |
| NFR-2 | Rate limits | No `throttle` anywhere | 🔴 | |
| NFR-3 | Secrets not exposed to clients | `vite.config.ts` no longer defines `GEMINI_API_KEY`; AI only via backend | ✅ | |
| NFR-4 | Error exposure | `APP_DEBUG=true` in `.env.example`; stack traces observed live | ⚠️ | |
| NFR-5 | Demo artefacts in production | Login pre-fills `demo123`; offline demo mode when API URL missing; `DEMO_RESET_ENABLED=true` in example | ⚠️ | |
| NFR-6 | Accessibility | 18 icon-only buttons without labels; few associated labels (21 `htmlFor` / 293 controls) | 🟡 | Needs axe audit |
| NFR-7 | Responsive layout | Tailwind breakpoints used; not visually verified | 🟡 | |
| NFR-8 | Performance | Single 1.42 MB bundle; bootstrap returns whole dataset | 🟡 | |
| NFR-9 | Observability | Laravel log only; no Sentry/metrics | 🔴 | |
| NFR-10 | Backups & recovery | Not defined | 🔴 | |
| NFR-11 | CI/CD | No pipeline | 🔴 | |
| NFR-12 | Tests | 120 backend tests; **no frontend tests** | 🟡 | |
| NFR-13 | Version control hygiene | AI-interview UI and 16 modified files uncommitted | ⚠️ | |

## 3. Endpoints not used by the frontend

Scripted check against the route table, then reviewed by hand (dynamic `PUT`/`POST` builders and signed file URLs removed as false positives).

| Endpoint(s) | Reason |
|---|---|
| `/placement/*` (7) | Duplicates of `/staff/placement/*`, which the UI uses |
| `GET /interviews/{id}/report`, `POST /interviews/{id}/answers` | UI uses `/evaluation` and `/turns/{turn}/answer` |
| `GET /students/me/readiness` | UI uses `/readiness-score` |
| `grade-rules` POST/PUT/GET one, `mark-schemes` POST/PUT/GET one/DELETE | Admin marks setup UI not wired (`saveGradeRule`, `saveMarkScheme` unused) |
| `attendance/*` (legacy `AttendanceController`: list, reports, update, delete, approve) | Superseded; staff UI calls sample `/staff/attendance/*` |
| `students/{student}/academics`, `education/{education}/verify`, `academics/recalculate` | Staff verification screens missing |
| `staff/marks/upload`, `student/assignments/submit` | Stubs |
| `GET /companies`, `GET /announcements`, `GET /masters` | Data comes from `/campus/bootstrap` instead |
| `GET /permissions/modules`, `GET /permissions/{permission}/check` | Unused helpers |

## 4. Frontend calls with problems

| Call | Problem |
|---|---|
| `fetchStaffWorkload` → `/staff/management?staff_id=5/workload` | Query string built into the middle of the path; never reaches `/staff/management/{staffId}/workload` |
| `TPODashboard`, `RecruiterDashboard` → `/api/jobs`, `/api/companies/{id}`, `/api/ai/extract-jd` | Old Express prototype endpoints; components not rendered |
| 44 API client functions | Defined but never called (listed in `01-code-inventory.md`) |

## 5. Tables without API, and screens without backend

| Tables without an API | Notes |
|---|---|
| `placement_drives`, `job_postings`, `eligibility_rules`, `job_applications`, `job_application_events` | Filled by `LegacyCompanyImporter` only |
| `placement_rounds`, `placement_results`, `revaluation_requests`, `fee_structures`, `student_fees`, `class_student`, `subject_allocations`, `timetables` (write), `dashboard_stats`, `demo_reset_logs`, `company_department` | No write API |
| `notifications` | Laravel table, unused |

| Screens without backend | Notes |
|---|---|
| `ClassesModule`, `TimetableModule`, `FeesModule`, `ExamsModule`, `SystemSettingsModule` | Local state only |
| `AttendanceMarking`, `DepartmentOverview`, `ExamCoordinatorModule`, `HODReportsAnalytics`, `HODStaffManagement`, `StudentAssignmentsMaterials`, `StudentNotifications` | Sample-data APIs |

## 6. Tenant-isolation findings

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| T-1 | `GET /staff/placement/applications` and `GET /placement/applications` return applications of **every** institution | `PlacementController::getApplications` uses `CompanyApplication::query()` (no `institution_id`, no scope). Reproduced on a scratch DB: institution 1 sees institution 2's application | **Critical** |
| T-2 | `company_applications`, `placement_rounds`, `placement_results`, `revaluation_requests`, `marks` have no `institution_id` | Schema | High (latent: any new direct query leaks) |
| T-3 | `CampusDataService::sync` (demo reset) deletes across all institutions | Code; gated by `DEMO_RESET_ENABLED` | High if enabled in production |
| T-4 | Spatie teams off | Config | Low while one user = one institution |

## 7. Security findings

| ID | Finding | Severity | Fix |
|---|---|---|---|
| S-1 | No rate limiting on login, register, uploads, AI endpoints | High | `throttle` named limiters per route group |
| S-2 | `APP_DEBUG=true` and `DEMO_RESET_ENABLED=true` in `.env.example` | High | Safe defaults + deployment checklist |
| S-3 | Demo credentials pre-filled on login; offline demo mode if API URL unset | Critical for production | Dev-only demo helpers; fail build without API URL |
| S-4 | Bearer token in `localStorage` | Medium | httpOnly cookie (Sanctum SPA mode) or short-lived tokens + refresh; strict CSP |
| S-5 | No password reset, no email verification | Medium | AUTH-2/AUTH-3 |
| S-6 | Resume/photo uploads validated, private disk, signed URLs | — (pass) | Add antivirus scan hook for production (optional) |
| S-7 | AI provider key only server-side | — (pass) | |
| S-8 | No append-only audit trail for admin/placement actions | Medium | AUTH-6 |
| S-9 | Tokens never expire (`config/sanctum.php` → `'expiration' => null`) | Medium | Set an expiration (e.g. 8–12 h) and a re-login / refresh flow |
| S-10 | SQLite databases are committed to git: root `database.sqlite` stores demo passwords in plain text, and `backend/alphagrew` holds hashed demo users. One-off root scripts (`test_api.php`, `verify_*.php`) create tokens and users when run | Low (demo data only) | Remove the files from the repo (after confirmation), add `*.sqlite` to `.gitignore`, and never reuse those passwords |
