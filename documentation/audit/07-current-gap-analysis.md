# 07 — Current Gap Analysis (Frontend ↔ Backend)

| Item | Value |
|---|---|
| Snapshot | `origin/main` at `ba2ca68` (PR #3 merged) + branch `feat/custom-fields-phase-1` (`39e8aeb`, pushed, PR pending), 16 November 2026 |
| Supersedes | The module table in `02-gap-analysis.md` (22 October) and the coverage numbers in `documentation/api/10-frontend-coverage.md` (10 November) |
| Evidence | `php artisan route:list` (471 API routes), a script matching every route against `frontend/src`, reading the rendered tabs in `CampusWorkspace.tsx`, the `MarkSampleData` middleware, and the test suites (backend 224+ passing, frontend 128 passing) |

Legend: ✅ Complete · 🟡 Partial · 🔴 Missing · ⚠️ Risk / broken. Gap IDs (`G-…`) are used in section 6.

---

## 1. Headline numbers

| Measure | Count | Change since 10 Nov |
|---|---|---|
| API routes | 471 (campus 321, owner console 150) | +194 (owner console, custom modules, sidebar layout) |
| Routes with no caller in the frontend | 44 (campus 39, owner 5) — of which 5 by design, 1 false alarm checked | was 26 |
| Routes still serving **sample data** (`X-Data-Source: sample`) | 45: `/staff/*` (42) and `/student/*` (3) | was 54 |
| Admin screens with **no backend at all** | 4 (Exams, Timetable, Classes, Fees) | unchanged |
| Components never rendered (dead code) | 4 files, ~1,570 lines | new finding |

---

## 2. Module status

| # | Module | Backend | Frontend | Status | Main gaps |
|---|---|---|---|---|---|
| 1 | Auth, sessions, verification, 2FA (owner) | Real | Complete | ✅ | `GET /auth/me` unused (by design) |
| 2 | Multi-tenancy | Real | — | ⚠️ | Staff without a department see **all** students; no recruiter rule (G-SEC-1, G-SEC-2) |
| 3 | Institution setup: departments, courses, subjects, designations, batches, campuses, masters, settings | Real | Complete | ✅ | Course create failed on MySQL (`duration_years`) — fixed on the phase-1 branch |
| 4 | Academic calendar: academic years, semesters | Real (`/academic-years`, one active year) | Academic years screen saves | ✅ | G-ACA-1 fixed (P1) |
| 5 | Classes, timetable (admin), subject allocations | Classes and allocations real (`/classes`, `/subject-allocations`); timetable 🔴 | Classes screen; Subjects → Faculty dialog; timetable static | 🟡 | G-ACA-2 fixed (P1); G-ACA-3 open |
| 6 | Exams and exam types (create, schedule) | Real: `/exams` CRUD, `/exam-types` (5 standard types seeded) | Exams screen for admins and coordinators; read-only for other staff | ✅ | G-EXM-1, G-EXM-2 fixed (P1); hall allocation / seating not built |
| 7 | Attendance | Real | Complete (mark, approve, reports) | 🟡 | `PUT/DELETE /attendance/{id}` unused; staff portal attendance pages are sample (G-STF-1) |
| 8 | Marks, review, publishing, results | Real | Complete | 🟡 | Grade-rule / mark-scheme editing has no UI; `result-publishing/logs`, `mark-review/get-submitted-marks`, `mark-entries/{id}` unused (G-MRK-1); old `/staff/marks/*` sample API still routed |
| 9 | Students & staff | Real | Complete (incl. custom fields after phase 1) | 🟡 | No bulk import; no documents; staff cannot open a student's career profile or academics (`/students/{id}/profile`, `/academics`, verify, recalculate unused) (G-PPL-1, G-PPL-2) |
| 10 | Placement (jobs, eligibility, pipeline, rounds, offers, policy) | Real | Complete for officers and students | 🟡 | Recruiter portal 🔴; legacy `/companies` + `/staff/placement/*` still routed; no live company edit screen (G-PLC-1) |
| 11 | Notifications | Real (in-app, email) | Complete | 🟡 | SMS 🔴 |
| 12 | Fees & payments (campus) | 🔴 none | Static screen | 🔴 | G-FEE-1 |
| 13 | Reports & analytics | Dashboards real; `reports/summary` unused; report downloads point to routes that do not exist | Dashboards complete; Reports tab partly sample | 🟡 | No export/download (G-RPT-1) |
| 14 | Staff portal (HOD, department, exam coordinator, staff reports) | **Sample data** (45 routes) | Screens render the sample data | ⚠️ | G-STF-1 |
| 15 | Student portal: assignments, materials | Sample | Screens render the sample data | ⚠️ | G-STU-1 |
| 16 | AI (interviews, resume, readiness) | Real | Complete | ✅ | Two alternative interview endpoints unused (by design) |
| 17 | Owner console (SaaS) | Real | Complete | ✅ | 5 routes without UI: report schedule edit/delete, subscription events, webhook toggle (G-OWN-1); payment webhook is server-to-server |
| 18 | Customization (modules & fields) | Real | Complete for phase 1 | 🟡 | Phases 0, 2–7 of `06-dynamic-customization-plan.md` (G-CUS-1) |

---

## 3. Backend done, frontend missing

| ID | Endpoints | What is missing |
|---|---|---|
| G-PPL-2 | `GET /students/{id}/profile`, `GET /students/{id}/academics`, `POST …/education/{id}/verify`, `POST …/academics/recalculate` | A staff view of a student's career profile and academic records (functions exist in `campusApi.ts`, no screen) |
| G-MRK-1 | `POST/PUT/DELETE /grade-rules`, `/mark-schemes`; `GET /result-publishing/logs`; `GET /mark-review/get-submitted-marks`; `GET /mark-entries/{id}` | Grade-rule and mark-scheme editors; publishing history |
| G-ATT-1 | `PUT /attendance/{id}`, `DELETE /attendance/{id}` | Correcting or removing a single attendance record |
| G-PRM-1 | `GET /permissions/modules`, `/permissions/roles/{id}`, `/permissions/{id}/check`; `GET /designations/list/global`, `/designations/{id}/by-department` | Not needed by current screens; remove or document as internal |
| G-RPT-2 | `GET /reports/summary` | No caller |
| G-OWN-1 | `PATCH/DELETE /owner/reports/schedules/{id}`, `GET /owner/subscriptions/{id}/events`, `POST /owner/webhooks/{id}/toggle` | Edit/delete a report schedule, subscription event history, enable/disable a webhook |
| — (by design) | `GET /auth/email/verify/{id}/{hash}`, `GET /files/*` (signed URLs), `POST /interviews/{id}/answers`, `GET /interviews/{id}/report`, `POST /owner/payments/webhook` | Opened from email / signed links / server-to-server |

---

## 4. Frontend done, backend missing or fake

| ID | Screen | Backed by | Effect |
|---|---|---|---|
| G-EXM-1 | Exams (admin) | Nothing (component state) | Exams "created" are lost on reload; mark entry depends on seeded exams |
| G-EXM-2 | Exam coordinator (staff) | `/staff/exam/*` sample (9 routes) | Same fixed exams for everyone; seating/invigilation not saved |
| G-ACA-2 | Classes | Nothing | Static |
| G-ACA-3 | Timetable (admin) | Nothing | Static; student timetable reads an API with no way to create entries |
| G-ACA-1 | Academic years | Read API only | "Add year" is not saved; empty lists show demo years |
| G-FEE-1 | Fees | Nothing | Static |
| G-STF-1 | Staff dashboard, department overview, HOD staff & reports, staff reports, staff attendance/marks pages | `/staff/department/*`, `/staff/management/*`, `/staff/reports/*`, `/staff/attendance/*`, `/staff/marks/*` sample (33 routes) | Fixed numbers; the same data is available for real through `/dashboards/query`, `/attendance/*`, `/mark-entries/*` |
| G-STU-1 | Student assignments, materials | `/student/assignments`, `/student/materials` sample (3 routes) | Same content for every student; no LMS backend |
| G-RPT-1 | Report "download" buttons | `download_url` pointing to routes that do not exist | Broken links |

---

## 5. Cross-cutting risks and quality gaps

| ID | Gap | Status | Notes |
|---|---|---|---|
| G-SEC-1 | `StudentRepository::visibleTo` limits staff to their department **only when `department_code` is set**; staff with no department see all students | ✅ Fixed (P0) | Deny by default: no department → no students Fix: no department → no students (or admin-only) |
| G-SEC-2 | No visibility rule for recruiters (they would receive every student) | ✅ Fixed (P0) — recruiters and other roles see none | Must be fixed before any recruiter login |
| G-SEC-3 | No field-level security on custom fields (a student reads every custom field of their own record) | ⚠️ | Plan phase 4 |
| G-DAT-1 | Custom field values are left behind when a record is deleted | ✅ Fixed (P0) — purged on force/hard delete | Plan phase 0.1 |
| G-TST-1 | Backend tests run only on SQLite; two MySQL-only failures this month (64-char index name, `courses.duration_years` NOT NULL) | 🟡 CI job added (P0), first run pending | Add a MySQL job to CI |
| G-SCH-1 | Schema drift: early migrations create columns the later "add if missing" migrations expect nullable (e.g. `courses.duration_years`, `total_semesters` NOT NULL on existing installs) | ✅ Fixed (P0) — `duration_years` nullable; `total_semesters` stays required by the API | Add a migration that aligns nullability explicitly |
| G-DUP-1 | Two placement APIs (`/companies`, `/staff/placement/*` vs `/placement/*`) and two marks systems (`/staff/marks/*`, `/student/marks` vs `/mark-entries`, results) | 🟡 | Old ones are marked deprecated; remove once offline demo no longer needs them |
| G-DEAD-1 | Unused components: `admin/DesignationsModule.tsx` (518 lines), `layouts/RoleBasedSidebar.tsx` (409), `staff/AttendanceMarking.tsx` (310), `staff/StaffDashboard.tsx` (334) | 🟡 | Delete, or mount if intended |
| G-CON-1 | Mixed API conventions (envelopes, casing, pagination) | 🟡 | New modules use camelCase `{data, meta}`; older ones return raw models |
| G-REP-1 | Local `main` carries an unpushed duplicate merge commit (`0df149b`, same tree as `origin/main`) | 🟡 | `git checkout main && git reset --hard origin/main` |

---

## 6. Recommended order

| Priority | Work | Closes | Why first |
|---|---|---|---|
| P0 ✅ | Fix staff-without-department visibility; add recruiter rule (deny by default) | G-SEC-1, G-SEC-2 | Data exposure |
| P0 ✅ | Migration aligning `courses` nullability; MySQL test job in CI | G-SCH-1, G-TST-1 | Two production-only failures already |
| P0 | Merge phase-1 PR; customization phase 0 (value cleanup, permissions) | G-DAT-1, part of G-CUS-1 | Small, removes misleading behaviour |
| P1 ✅ | **Exams & exam types API** + connect Exams and Exam-coordinator screens | G-EXM-1, G-EXM-2 | Mark entry and results depend on exams that today can only be seeded |
| P1 ✅ | **Subject allocations, classes, academic years write** | G-ACA-1, G-ACA-2 | Needed by mark entry and timetable |
| P1 ✅ | Replace staff-portal sample endpoints with real queries (mostly reuse `/dashboards/query`, attendance and mark-entry services) | G-STF-1 (department overview, HOD reports, HOD staff) | 33 of 45 sample routes; staff see fake numbers today |
| P2 ✅ | Timetable API + admin screen | G-ACA-3 | Student timetable already reads it |
| P2 ✅ | Staff view of student profile/academics; grade-rule & mark-scheme editors; attendance correction | G-PPL-2, G-MRK-1, G-ATT-1 | Backend already exists — frontend-only work |
| P2 ✅ | Bulk import (students, staff) and exports with real downloads | G-PPL-1, G-RPT-1 | Long-standing PRD gap |
| P3 ✅ | Fees module (campus, record-keeping) | G-FEE-1 | Larger scope; needs a payment decision |
| P3 ✅ | Recruiter portal, SMS, LMS (assignments/materials), documents | G-PLC-1, G-STU-1 | New products rather than gaps in existing ones |
| P3 🟡 | Remove dead components and deprecated APIs; owner-console leftovers | G-DEAD-1, G-DUP-1, G-OWN-1 | Housekeeping. Dead components and owner leftovers done; deprecated sample APIs stay while the offline demo uses them |

Customization phases 2–7 (`06-dynamic-customization-plan.md`) run in parallel once P0 is done.

---

## 7. Progress after P1 part 3, P2 and P3 (branch `feat/p1-exams-academics`, 16 November 2026)

| Gap | Now | Where |
|---|---|---|
| G-STF-1 | Department overview, HOD reports and department staff use real data (`/department-portal/*`). HODs with staff.create/edit/delete manage staff of their own department only, and can grant only designations whose permissions they hold themselves. Other `/staff/*` sample routes remain for the offline demo | `DepartmentPortalController`, `Services/Departments/DepartmentPortal` |
| G-ACA-3 | Timetable CRUD with class, faculty and room clash checks; class rosters (`/classes/{id}/students`) | `TimetableController`, `TimetableModule.tsx`, `ClassRosterDialog.tsx` |
| G-MRK-1 | Grade-rule and mark-scheme editors (Marks → Grade scales) | `GradeScalesPanel.tsx` |
| G-ATT-1 | Attendance → Correct Records: edit or delete single records, export a day | `AttendanceRecords.tsx` |
| G-PPL-2 | Student profile dialog for staff: profile, academics, education verification, documents | `StudentProfileDialog.tsx` |
| G-PPL-1 | CSV import of students and staff with a dry run, per-row errors and set-password emails | `ImportController`, `Services/Imports/BulkImporter` |
| G-RPT-1 | CSV exports: students, staff, attendance, published results (audited, rate-limited) | `ExportController`, `ExportButton.tsx` |
| G-FEE-1 | Fees as record-keeping: fee structures, assignment to a class or students, dues, payments with receipts, voids with a reason, overdue status, "My fees" for students. No online payment gateway | `FeeController`, `FeesModule.tsx`, `StudentFeesView.tsx` |
| G-STU-1 (documents) | Students upload documents; staff verify or reject with remarks; files on private storage via 5-minute signed links | `StudentDocumentController`, `StudentDocumentsView.tsx` |
| G-STU-1 (LMS) | Materials, assignments, submissions (text or file, late rules), grading; students see their department/year subjects, faculty their allocated subjects | `LmsController`, `StudentLmsView.tsx`, `TeachingLmsView.tsx` |
| G-PLC-1 | Recruiter portal: the placement office invites recruiters per company (Placement → Recruiter accounts); recruiters sign in, see their company's jobs and only candidates moved past "applied", and leave feedback on the application history. They cannot change statuses or see the student list | `RecruiterController`, `RecruiterPortal.tsx`, `RecruiterAccountsDialog.tsx` |
| SMS | Third notification channel, off by default per user. Drivers: `log`, `twilio`, `msg91` (`SMS_DRIVER`, see `config/services.php`); empty = off and the option is hidden. Phone from the account, else the student record, normalised to E.164 | `Notifications/Channels/SmsChannel`, `Services/Sms/*`, Notifications → Preferences |
| G-DEAD-1 | The four unused components were removed | — |
| G-OWN-1 | Report schedules can be paused, resumed and deleted; webhooks enabled and disabled. Subscription events were already shown in the subscription detail (served by the detail endpoint), so `/subscriptions/{id}/events` stays unused | `ReportsPage.tsx`, `IntegrationsPage.tsx` |
| G-DUP-1 | Open. The deprecated `/staff/*`, `/companies` and `/staff/marks/*` routes still feed the offline demo; remove them together with the demo's sample screens | — |

Still open: G-SEC-3 (field-level security), G-CON-1 (API conventions), G-PRM-1 / G-RPT-2 (unused internal routes), exam hall allocation and seating, online fee payment, customization phases 2–7.
