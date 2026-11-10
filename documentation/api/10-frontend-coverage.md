# Frontend coverage of the API

For each backend module this page answers three questions:
1. Does the backend have real business logic, or does it return sample data?
2. Does a screen in the web app call it?
3. Which CRUD operations does that screen offer?

Checked on 10 November 2026 against 277 routes. It was produced by matching every call in `frontend/src` against `php artisan route:list`, then reading which components are actually rendered by `CampusWorkspace.tsx`. A function in `src/api/` that no rendered screen uses counts as "no UI".

**Legend.**
- **Logic.** **Real**: reads and writes database tables. **Sample**: hardcoded data, sends `X-Data-Source: sample`. **Read-only**: lists real data but has no write endpoints.
- **CRUD.** **C** create, **R** read, **U** update, **D** delete, as offered by the screen. "—" means no screen.

## 1. Backend and frontend both complete

| Module | Endpoints | Logic | Screen | CRUD | Notes |
|---|---|---|---|---|---|
| Auth, profile, sessions, password reset, email verification | `/auth/*` | Real | Login, register, forgot/reset password, Security settings | C R U D | The email verification link is opened from the email. `GET /auth/me` has no caller: the app loads the signed-in user another way. |
| Students (admin side) | `/students`, `/students/{id}/profile` | Real | Students | C R U D | Custom fields included. |
| Staff accounts | `/staff` | Real | Staff | C R U D |  |
| Invitations and registrations | `/invitations`, `/registrations` | Real | Onboarding | C R D, approve, reject |  |
| Departments | `/departments` | Real | Departments | C R U D | `GET /departments/{id}/stats` is used by Department overview. |
| Designations | `/designations` | Real | Designations | C R U D | `list/global` and `{id}/by-department` have no caller. |
| Courses, subjects, semesters | `/courses`, `/subjects`, `/semesters` | Real | Courses, Subjects, Academic years | C R U D | Academic years are read through `/semesters/list/academic-years`. |
| Master options | `/masters` | Real | Masters | C R U D |  |
| Announcements | `/announcements` | Real | Announcements | C R U D |  |
| Audit log | `/audit-logs` | Real | Audit log | R |  |
| Roles and permissions | `/permissions/*` | Real | Roles and permissions | R | `modules` and `{id}/check` have no caller. |
| Companies and drives | `/companies`, `/staff/placement/*` | Real | Placement, Placement officer | C R U D, apply |  |
| Attendance | `/attendance/*` | Real | Attendance (mark, approve, reports) | C R U | `DELETE /attendance/{id}` has no caller. |
| Mark entry (faculty) | `GET /exams?mine=1`, `/mark-entries/get-students`, `save-draft`, `submit` | Real | Marks → Enter Marks (`TeacherMarkEntry`) | C R U, submit | Shown to staff with `marks.create`. Added 10 November 2026. `MarksWorkflowModule` is an older, unmounted version. |
| Mark review and publishing | `/mark-review/*`, `/result-publishing/*` | Real | Marks | verify, approve, reject, bulk approve, publish, unlock |  |
| Grade rules | `/grade-rules` | Real | Marks → Grade rules | R, set up defaults | Create, edit and delete of single rules have no UI (see section 2). |
| Student results | `/student/results/*` | Real | My marks | R |  |
| Student career profile | `/students/me/*` | Real | Career profile, Resumes, AI interviews, Readiness | C R U D | Projects, experience, certifications, education, skills, resumes, recommendations. |
| AI interviews | `/interviews/*` | Real | AI interviews | C R | `POST /interviews/{id}/answers` and `GET /interviews/{id}/report` are alternatives the app does not use. It uses `turns/{turn}/answer` and `evaluation`. |
| Dashboards | `/dashboards/*` | Real | Dashboard (builder, templates, sharing) | C R U D, share |  |
| Custom fields | `/custom-fields/*` | Real | Master data → Custom fields; student form | C R U D | Values for staff, subjects and exams have no form yet. |

## 2. Backend done, no frontend screen

These endpoints work and are documented, but nothing in the app calls them, or the screen that calls them is never rendered.

| Module | Endpoints | What is missing in the frontend |
|---|---|---|
| Grade rules and mark schemes (edit) | `POST/PUT/DELETE /grade-rules`, `POST/PUT/DELETE /mark-schemes` | The Marks screen lists them and sets up the default scale. `saveGradeRule` and `saveMarkScheme` exist in `campusApi.ts` but no screen uses them. |
| Batches | `/batches` (6 routes) | The Classes screen is static and makes no API calls. |
| Campuses (sites) | `/campuses` (4 routes) | No screen. |
| Institution settings and logo | `GET /institution`, `PUT /institution/settings`, `POST /institution/logo` | System settings keeps its values in local component state and saves nothing. |
| Placement policy | `GET/PUT /placement-policy` | No screen. The backend does not enforce the policy yet either. |
| Reports summary | `GET /reports/summary` | No caller. |
| Staff-side student academics | `GET /students/{id}/academics`, verify education, recalculate | `fetchStaffStudentAcademics`, `verifyStudentEducation` and `recalculateStudentAcademics` exist in `campusApi.ts` but no screen uses them. |
| Notification preferences | `GET/PUT /student/notifications/preferences` | API functions exist but no screen uses them. Students would get 403 anyway (known issue 5). |

## 3. Frontend screen without a real backend

These screens are visible in the app but show fixed data, or data that is never saved.

| Screen | Backed by | Effect |
|---|---|---|
| Exams (admin) | Nothing: a hardcoded list in component state | Exams created here are not saved. The backend only has `GET /exams`. Creating and scheduling exams has no API yet. |
| Exam coordinator | `/staff/exam/*` (sample) | Same fixed exams for everyone. Invigilator and room assignments are not saved. |
| Timetable (admin), Classes, Fees, System settings | Nothing | Static screens. The backend has no timetable, class or fee API. Institution settings exist (section 2) but are not wired. |
| Student timetable, assignments, materials, notifications | `/student/timetable` (broken, known issue 2) and `/student/assignments`, `/student/materials`, `/student/notifications` (sample) | Same fixed content for every student. |
| Staff dashboard, department overview, HOD staff and reports, staff reports | `/staff/dashboard`, `/staff/department/*`, `/staff/management/*`, `/staff/reports/*` (sample) | Fixed numbers. The role dashboards under Dashboard show real data. |
| Staff marks entry (`components/staff/MarksEntry.tsx`) | `/staff/marks/*` (sample) | Not rendered. It would use the old `marks` table, not the results workflow. |
| `components/admin/AdminDashboard.tsx` | `/api/analytics/overview`, `/api/admin/*`, `/api/jobs` | These URLs do not exist. The component is exported but not rendered: the admin home is `renderAdminDashboard` in `CampusWorkspace.tsx`. |

## 4. Summary

| | Routes |
|---|---|
| Backend routes | 277 |
| Route paths referenced somewhere in `frontend/src` | 251 (this includes code in screens that are never rendered, listed in section 2) |
| No caller, by design: signed file URLs (2), email verification link (1), alternative interview endpoints (2) | 5 |
| No caller, missing UI: batches (6), campuses (4), institution (3), placement policy (2), designations `list/global` and `by-department` (2), permissions `modules` and `check` (2), `reports/summary` (1), `auth/me` (1) | 21 |
| Sample-data routes | 54 (43 under `/staff`, 11 under `/student`) |

Highest-value gaps, in order:
1. ~~Mount a faculty mark-entry screen~~. Done: Marks → Enter Marks.
2. Add exam scheduling: a backend API for exams and exam types, and connect the Exams screen to it.
3. Connect the staff portal screens to real data. Most of their numbers are already available through `/dashboards/query`.
4. Wire institution settings, batches, campuses and placement policy, which only need frontend work.
