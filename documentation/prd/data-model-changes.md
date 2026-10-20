# Data Model Changes — PRD Addendum

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Addendum to Master Product Documentation v1.0 (PRD / SRS) |
| Extends | Section 14 "Database Blueprint" |
| Version | 1.1 draft |
| Date | 20 October 2026 |
| Status | Draft for approval |
| Audience | Development, QA, Product |

## D1. How to read this document

Each table in Section 14 is compared with the current Laravel migrations.

- **Exists**: the table exists and has the right shape.
- **Partial**: the data lives somewhere else, or the table needs rework.
- **Missing**: not started.

Campus Academics tables (attendance, timetable, exams, marks, results, fees) are covered in the Campus Academics addendum, section A7.

## D2. Rules for every table

1. Every table that holds institution data has `institution_id` (`NOT NULL`, indexed, foreign key to `institutions`), set from the logged-in user, never from the request.
2. Exceptions with nullable `institution_id`: `users` (Super Admin, Recruiter), shared question bank rows, platform default `grade_rules` / `exam_types`, logs written by the platform.
3. Unique keys that are global today become unique per institution, e.g. `unique(institution_id, code)`.
4. Laravel already uses the table name `jobs` for its queue, so job postings are called **`job_postings`**.
5. Files are never stored in the database. Tables hold metadata; files go to private S3-compatible storage under `institutions/{id}/…`.
6. Records that admins delete use soft deletes, as `students` and `users` already do.

## D3. Identity and institution

| PDF table | Status | Current state → change |
|---|---|---|
| `users`, `roles`, `permissions` | Exists | Spatie tables. Add `institution_id` to `users` and turn on Spatie teams. |
| `sessions` | Exists | — |
| `devices` | Missing | Device name, platform, push token and last-seen time per Sanctum token, so tokens can be revoked per device. |
| `institutions` | Partial | `colleges` exists: rename it and add `slug`, `domain`, `plan_id`, `settings` JSON and branding fields. |
| `campuses` | Missing | New table, child of institution. Departments optionally reference a campus. |
| `departments`, `courses`, `semesters`, `academic_years` | Exists | Add `institution_id`. `departments.code` is globally unique today, so two institutions can't both have "CSE". Change to `unique(institution_id, code)`. |
| `batches` | Partial | Stored as text in `classes.batch` ("2021-2025"). Make it a table so eligibility rules can target `batch = 2027`. |

## D4. Students

| PDF table | Status | Current state → change |
|---|---|---|
| `students` | Exists | `email` and `registration_number` are globally unique: scope both by institution. Move the placed company text out to `placements`. |
| `student_profiles` | Partial | Currently the `students.resume_profile` JSON. Split into a table with a visibility flag per field ("expose only authorized fields to recruiters"). |
| `student_academics` | Partial | Only `cgpa` today. Add 10th/12th/UG history and the derived values from the Campus Academics addendum (A6): `cgpa`, `active_backlogs`, `backlog_history`, `attendance_percentage`. |
| `student_skills` | Exists | Point it at a shared `skills` catalogue so job matching compares IDs, not free text. |
| `student_projects`, `student_certifications`, `student_experience` | Missing | New tables. |
| `student_documents`, `resumes` | Missing | File metadata only (D2 rule 5). |

## D5. Placement

| PDF table | Status | Current state → change |
|---|---|---|
| `companies` | Partial | Reduce to the organisation only. Move `role`, `package_offered`, `drive_date`, `eligible_departments` and the `applicants`/`shortlisted` counters into the tables below. |
| `institution_company` | Missing | Pivot. One company recruits at many institutions; its recruiters see only the institutions linked here. |
| `company_contacts` | Missing | Links recruiter users to a company. |
| `job_postings` | Missing | Title, description, CTC, location, required skills. |
| `placement_drives` | Missing | Groups job postings for one institution and date window. |
| `eligibility_rules` | Partial | Only an `eligible_departments` JSON today. One row per condition: `field`, `operator`, `value`, e.g. `cgpa ≥ 7.0`, `active_backlogs = 0`, `department ∈ {CSE, IT}`, `batch = 2027`. Fields read from `student_academics`. |
| `applications` | Partial | `company_applications` has no status. Rebuild against `job_postings` with a status field and an `application_events` history table. |
| `shortlists`, `interviews` | Partial | `placement_rounds` and `placement_results` exist but nothing reads them. Re-key them to applications. |
| `offers`, `placements` | Missing | New tables: offer letter, CTC, accept/decline, joining date. |

## D6. Assessment, AI, communication, audit, SaaS

| PDF table | Status | Current state → change |
|---|---|---|
| `assessments`, `assessment_sections`, `questions`, `question_options`, `attempts`, `answers`, `results`, `result_details` | Missing | All new. Kept separate from the academic `exams` / `mark_entries` tables. Questions with `institution_id = null` form a shared global bank. Coding questions also need `question_test_cases`. |
| `ai_resume_analyses`, `ai_interviews`, `ai_interview_questions`, `ai_interview_answers`, `ai_interview_evaluations`, `ai_recommendations`, `skill_gap_reports` | Missing | All new. Add `prompt_templates` (versioned) and `ai_usage_logs` (model, tokens, cost, institution) to meet Sections 20 and 27. |
| `readiness_models`, `readiness_scores` | Missing | Not in Section 14 but required by Section 9: weights configurable per institution, scores stored per student over time. |
| `announcements` | Exists | Already has `college_id`; rename to `institution_id`. |
| `notifications`, `notification_preferences` | Missing | `NotificationsController` returns hardcoded arrays. Use Laravel's standard `notifications` table plus a preferences table. |
| `activity_logs` | Exists | Add `institution_id`. |
| `audit_logs` | Missing | Append-only: actor, institution, action, before/after values. Used for admin, results and placement actions. |
| `plans`, `subscriptions`, `usage_counters`, `ai_credit_ledger` | Missing | Phase 13. Design the columns now so `institutions.plan_id` has something to point at. |

## D7. Migration order

Each step ships with its migrations, model changes and tests, and leaves the app working.

1. **Tenant foundation:** rename `colleges` → `institutions`, `college_id` → `institution_id`; create a default institution and backfill every row; add `institution_id` to the remaining D3 tables; per-institution unique keys; institution global scope on models.
2. **Roles:** Spatie teams on; role changes in the User Roles addendum (R7).
3. **Campus Academics:** `batches`, merged `classes`, single marks table, `student_academics` (Campus Academics addendum A7).
4. **Students:** `student_profiles`, history tables, `student_documents`, `resumes`, `skills` catalogue.
5. **Placement:** split `companies`; `institution_company`, `company_contacts`, `job_postings`, `placement_drives`, `eligibility_rules`, `applications` + `application_events`, re-keyed rounds, `offers`, `placements`. Migrate existing `companies` rows into one posting + one drive each.
6. **Communication and audit:** `notifications`, `notification_preferences`, `audit_logs`, `devices`.
7. **Assessments**, then **AI**, then **readiness**, then **SaaS** tables, in the phase order of Section 22.

### Implementation status (20 October 2026)

Step 1 is done (migration `2026_10_20_000002_add_institution_id_to_tenant_tables`):

- `institution_id` (NOT NULL, foreign key) on departments, courses, subjects, academic_years, semesters, classes, students, designations, master_options, announcements, attendance, timetables, exams, mark_schemes, mark_entries, grade_rules, semester_results, fee_structures, student_fees and companies; nullable on users and activity_logs. Existing rows take their old `college_id`, otherwise the default institution.
- Unique per institution: department, course, subject, academic-year and class codes; student email and registration number; designation name and slug; master option category + code; grade-rule score bands. User email stays unique across the platform.
- `colleges` and every `college_id` column removed. The unused `company_department` pivot lost its foreign key to `departments.code` (no longer unique on its own) and is replaced in step 5.
- Enforcement: `BelongsToInstitution` trait on 20 models, `SetTenant` middleware, `TenantRule` for validation, and `TenantIsolationTest` (cross-institution reads and writes return 404).

Tables in the list that don't exist yet (campuses, batches, placement tables, assessments, AI, notifications, audit_logs, usage_counters) are created with `institution_id` in their own steps. `exam_types`, `marks`, `class_student`, `subject_allocations`, `placement_rounds/results`, `revaluation_requests` and `result_publishing_logs` inherit the institution through their parent row.

## D8. Tests required

1. Every migration runs on MySQL and on the SQLite test database (fresh and from the previous version).
2. Backfill: after step 1, every existing row has the default `institution_id` and no row is lost.
3. Per-institution uniqueness: two institutions can both create department `CSE` and student email `a@x.edu`; the same institution cannot.
4. Global scope: a query from institution A never returns institution B rows, for every model with `institution_id`.
5. `companies` split: each old company row becomes one posting and one drive with the same eligibility.

### Open questions for product

1. Is student email unique per institution, or across the platform (one student, one login)?
2. Are companies shared across institutions (one "TCS" record) or created per institution?
3. How long are resumes, interview recordings and AI transcripts kept (Section 19 retention rule)?
