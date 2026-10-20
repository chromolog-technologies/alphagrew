# Campus Academics Module — PRD Addendum

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Addendum to Master Product Documentation v1.0 (PRD / SRS) |
| Adds | Section 5.1 module "Campus Academics"; new sections A1–A12 below |
| Version | 1.1 draft |
| Date | 20 October 2026 |
| Status | Draft for approval |
| Audience | Product, Development, QA, Management |

## A1. Why this module is being added

The codebase already contains attendance, timetable, exams, marks and result publishing, and fees. The marks pipeline (draft → submitted → verified → approved → published and locked) is the most complete workflow in the system. Master Documentation v1.0 does not mention any of these features.

They stay in the product as one module, **Campus Academics**, for two reasons:

1. **They feed placement eligibility.** Section 10 of the Master Documentation defines eligibility rules such as `CGPA ≥ 7.0 AND backlog count = 0`. Those values come from published semester results. Today eligibility reads `students.cgpa`, a number typed in by hand, and nothing calculates backlogs.
2. **Institutions expect them.** A campus platform without attendance and results makes the institution keep a second system, and the two copies of CGPA drift apart.

Being in the PRD puts the module under the same rules as every other module: tenant isolation (Section 13), RBAC, audit logging (Section 19) and automated tests (Section 25).

## A2. Scope

| Sub-module | Purpose | Current state in code |
|---|---|---|
| Classes and batches | Group students by course, semester and batch | `classes`, `class_student` tables exist. `classes` is created by two different migrations with different columns. Batch is free text. Admin screen keeps data in the browser only. |
| Subject allocation | Assign faculty to subjects per semester | `subject_allocations` table exists; no API or screen. |
| Timetable | Weekly schedule per class | Student read API works (`/student/timetable`). Admin screen keeps data in the browser only; no create/edit API. |
| Attendance | Daily attendance per subject, approval, reports | Student read API works. The real controller (`/attendance/*`) queries columns that don't exist (`classes.subject_id`, `students.roll_number`). The staff marking screen posts to a sample-data controller that saves nothing. |
| Exams | Exam types, schedule, max marks | `exams`, `exam_types` tables exist. **No API to create exams**, so mark entry cannot be started from the UI. Exam Coordinator screen uses sample data. |
| Marks and results | Mark entry, review, grading, publishing, revaluation | Working API: grade rules, mark schemes, mark entry, review, publish/unlock, student results. `revaluation_requests` table has no API. |
| Fees | Fee structures and student dues | `fee_structures`, `student_fees` tables exist; no API, no permissions. Screen keeps data in the browser only. A separate `students.fee_status` field is edited by hand. |

**Out of scope for this addendum:** online fee payment gateway, hall tickets, seating allocation, library, hostel and transport.

## A3. Roles and permissions

Roles follow the target role model in the gap analysis: role = account type, designation = job title that adds permission bundles inside one institution.

| Capability | Institution Admin | HOD (Faculty + designation) | Faculty | Exam Coordinator (Faculty + designation) | Placement Officer | Student |
|---|---|---|---|---|---|---|
| Manage classes, batches, subject allocation | ✓ | Own department | — | — | — | — |
| Manage timetable | ✓ | Own department | View own | — | — | View own |
| Mark attendance | — | ✓ | Own subjects | — | — | — |
| Approve / correct attendance | ✓ | Own department | — | — | — | — |
| Schedule exams, exam types | ✓ | — | — | ✓ | — | View own |
| Configure grade rules, mark schemes | ✓ | — | — | ✓ | — | — |
| Enter and submit marks | — | ✓ | Own subjects | — | — | — |
| Verify / approve / reject marks | ✓ | Own department | — | ✓ | — | — |
| Publish / unlock results | ✓ | — | — | ✓ | — | — |
| View published results | ✓ | Own department | Own subjects | ✓ | CGPA and backlogs only | Own |
| Request revaluation | — | — | — | — | — | Own |
| Manage fee structures and dues | ✓ | — | — | — | — | View own |

Permission names, existing and new:

- Existing: `classes.*`, `timetable.*`, `attendance.view|mark|edit|delete|approve`, `exams.*`, `marks.view|create|edit|delete|publish`.
- **Add:** `marks.approve` (used by routes and seeders today but not declared), `results.view_summary` (CGPA and backlog read access for placement), `revaluation.request`, `revaluation.manage`, `fees.view|create|edit|delete`.
- "Own department" and "own subjects" are checked in the service layer, not by permission name alone.

## A4. Functional requirements

### Classes and batches
- Create batches (e.g. `2027`) and classes (course + semester + batch + section).
- Assign students to a class for a date range; a student has one active class per semester.
- Allocate faculty to subjects per semester; this allocation decides who may mark attendance and enter marks.

### Timetable
- Define weekly slots: class, subject, faculty, day, start/end time, room, session type.
- Reject overlapping slots for the same class, faculty or room.
- Students and faculty see their own timetable.

### Attendance
- Faculty mark attendance per subject session: present, absent, late, leave.
- Re-submitting the same session updates the records instead of duplicating them.
- HOD approves or corrects records; corrections keep the original value in the audit log.
- Attendance percentage per student per subject and overall is calculated, not typed in.

### Exams
- Configure exam types with max marks, passing marks and weightage (e.g. Internal 1, Internal 2, End Semester).
- Schedule exams per subject and semester with date, time, mode and location.

### Marks and results
- Grade rules map score bands to grade and grade point.
- Mark schemes set internal, external, total and pass marks per subject and semester.
- Faculty save drafts, then submit; reviewers verify, approve or reject with remarks.
- Publishing a semester is blocked until every entry is approved. Publishing creates or recalculates `semester_results` and locks all entries.
- Unlocking requires a reason and is audit-logged.
- Students request revaluation within a configurable window. A change of marks after revaluation recalculates the semester result and the academic summary (A6).

### Fees
- Define fee structures per academic year, course and semester.
- Generate dues per student from the structure; record payments manually.
- Fee status shown to the student is derived from dues and payments, replacing the hand-edited `students.fee_status`.

## A5. Workflows

**Marks and results**

Admin/Exam Coordinator configure grade rules, mark schemes, exam types and exams → Faculty enter marks (draft) → Submit → Reviewer verifies → Approves (or rejects back to draft) → Exam Coordinator publishes semester → Entries locked, semester results created → **Academic summary recalculated (A6)** → Student sees result → Optional revaluation → Recalculate.

Entry states: `draft → submitted → verified → approved → locked`. Reject returns to `draft`. Unlock returns `locked → approved`.

**Attendance**

Timetable slot → Faculty marks session → HOD approves or corrects → Percentages recalculated → Low-attendance alert to student (Communication module).

**Fees**

Fee structure → Dues generated per student → Payment recorded → Status derived → Reminder notifications for overdue dues.

## A6. Integration with the eligibility engine

This is the main reason the module exists in the PRD. Placement eligibility (Section 10) must read **derived** academic values, never hand-entered ones.

| Value | Definition | Source | Recalculated when |
|---|---|---|---|
| `cgpa` | Credit-weighted average of grade points across all **published** semesters | `semester_results`, `mark_entries`, `subjects.credits`, `grade_rules` | Results published, unlocked and republished, or revaluation completed |
| `active_backlogs` | Subjects whose latest published result is a fail | `mark_entries` (locked) | Same as above |
| `backlog_history` | Subjects ever failed, including those since cleared | `mark_entries` (locked) | Same as above |
| `attendance_percentage` | Present ÷ conducted sessions, overall and per subject | `attendance` | Attendance submitted, approved or corrected |

- Store these values in `student_academics` (Section 14 table) with `calculated_at`. The existing `students.cgpa` and `students.attendance` columns stop being editable and are removed once everything reads from `student_academics`.
- Recalculation runs as a queued job per affected student, so publishing a large semester stays fast (Section 18, performance).
- Eligibility rules reference these fields by name (`cgpa`, `active_backlogs`, `attendance_percentage`, `batch`, `department`), so the rule engine never queries marks tables directly.
- Placement Officers see the summary values through `results.view_summary`, not individual marks.

## A7. Data model

Existing tables kept: `classes`, `class_student`, `subject_allocations`, `timetables`, `attendance`, `attendance_approvals`, `exam_types`, `exams`, `grade_rules`, `mark_schemes`, `mark_entries`, `semester_results`, `result_publishing_logs`, `revaluation_requests`, `fee_structures`, `student_fees`.

Required changes:

| Change | Reason |
|---|---|
| Add `institution_id` to every table above (see A8) | Tenant isolation |
| Add `batches` table; `classes.batch_id` replaces free-text `classes.batch` | Eligibility rules filter by batch |
| Merge the two `classes` migrations into one schema | Today the second migration is skipped or conflicts depending on order |
| Make `mark_entries` the only marks table; migrate and drop the older `marks` table | Two parallel marks stores exist; `/student/marks` reads the old one while results publishing uses the new one |
| Add `student_academics` with the A6 fields | Single source for eligibility |
| Add `fee_payments` (amount, date, mode, reference, recorded_by) | `student_fees.amount_paid` alone has no payment history |
| Remove hand-edited `students.cgpa`, `students.attendance`, `students.fee_status` after cutover | Avoid two versions of the truth |

## A8. Tenant scoping

Follows Section 13 and the tenant design in the gap analysis.

- Every table in A7 gets `institution_id`, `NOT NULL`, indexed, set from the authenticated user, never from the request.
- `grade_rules` and `exam_types` may have `institution_id = null` for platform defaults that an institution copies and edits.
- Unique keys become per institution: class code, exam type code, grade per rule set.
- Queued recalculation jobs carry `institution_id` and restore the tenant context before running.
- Result publishing, unlocking and attendance corrections are written to `audit_logs` with institution, actor, before and after values.

## A9. API

Existing endpoints that stay, under `/api/v1`: `grade-rules`, `mark-schemes`, `mark-entries` (incl. `get-students`, `save-draft`, `submit`), `mark-review` (`verify`, `reject`, `approve`, `exam-summary`), `result-publishing` (`status`, `publish`, `unlock`, `logs`), `student/results`, `student/attendance`, `student/timetable`, `attendance/*`.

To add:

| Area | Endpoints |
|---|---|
| Batches and classes | `GET/POST /batches`, `GET/POST/PATCH/DELETE /classes`, `POST /classes/{id}/students` |
| Subject allocation | `GET/POST/DELETE /subject-allocations` |
| Timetable | `GET/POST/PATCH/DELETE /timetables` |
| Exams | `GET/POST/PATCH/DELETE /exam-types`, `GET/POST/PATCH/DELETE /exams` |
| Revaluation | `POST /student/revaluations`, `GET /revaluations`, `POST /revaluations/{id}/complete` |
| Academic summary | `GET /students/{id}/academic-summary` |
| Fees | `GET/POST/PATCH /fee-structures`, `POST /fee-structures/{id}/generate-dues`, `GET /student-fees`, `POST /student-fees/{id}/payments`, `GET /student/fees` |

All list endpoints are paginated (`page`, `per_page`), following the Students endpoint pattern.

## A10. Tests required

Feature tests per Section 25, added with each sub-module:

1. Marks state machine: every allowed transition succeeds; every disallowed one (e.g. approve a draft, edit a locked entry) is rejected.
2. Publishing is refused while any entry is not approved; succeeds and locks all entries when all are approved.
3. Academic summary: CGPA and backlog values match a hand-calculated fixture across two semesters, including a cleared backlog.
4. Revaluation changes marks and recalculates CGPA.
5. Eligibility reads `student_academics`: changing a published result changes the eligible-student list.
6. Attendance: duplicate submission updates instead of inserting; percentage is correct after a correction.
7. Timetable overlap is rejected for class, faculty and room.
8. Permissions: faculty cannot enter marks for an unallocated subject; HOD cannot approve another department's records; student sees only own results and fees.
9. **Tenant isolation:** a user in institution A gets 404 for every academic resource ID belonging to institution B, on every endpoint in A9.

## A11. Acceptance criteria

Continues the numbering of Section 30.

15. An administrator can create batches and classes and assign students and faculty.
16. Faculty can mark attendance for an allocated subject, and the student sees the updated percentage.
17. An Exam Coordinator can create an exam, and faculty can enter marks against it from the UI.
18. Results can be reviewed, published and locked, and the student sees the published result.
19. After publishing, the student's CGPA and active backlog count update automatically with no manual entry.
20. A placement eligibility rule using CGPA and backlogs returns the correct students from published results.
21. An administrator can define a fee structure, generate dues and record a payment; the student sees the current status.
22. No academic data is visible across institutions.

## A12. Priority and phase placement

| Priority | Scope | Reason |
|---|---|---|
| **P0** | Marks and results pipeline fixes, exam CRUD, `student_academics` with CGPA and backlogs, tenant scoping of these tables | Eligibility (P0) depends on it |
| P1 | Attendance fixes and reports, classes and batches, timetable CRUD | Daily institution use; attendance can become an eligibility rule |
| P2 | Revaluation, fees and payments | Useful, not required for placement MVP |

Placement in the delivery plan: **Phase 3b**, directly after the tenant foundation (Phase 2) and before Placement rework (Phase 4), so eligibility rules can be built on real academic data.

### Defects to fix as part of this work

- Attendance controller queries `classes.subject_id` and `students.roll_number`, which don't exist.
- Staff attendance and marks screens post to sample-data controllers that save nothing.
- `marks.approve` is used by routes and seeders but not declared in `CampusPermission`.
- `departments.hod` is read when creating students but no longer exists in the schema; new students get an empty mentor.
- Two `classes` migrations with different columns.
- Two marks tables (`marks` and `mark_entries`) used by different screens.

### Open questions for product

1. Is CGPA on a 10-point scale for every institution, or must the scale be configurable per institution?
2. Does a backlog count when the subject is failed but the student was absent (`is_absent`)?
3. Should eligibility use attendance percentage by default, or only when a placement officer adds that rule?
4. Is fee status allowed as an eligibility rule (e.g. block drives for students with overdue fees)?
