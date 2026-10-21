# Backend gaps

Recorded 21 October 2026 by reading `backend/routes/api.php`, `MarkSampleData`, and the specs under `documentation/`. This file indexes disagreements. It does not replace the journey specs.

Statuses: **implemented** (persists, outside `sample-data`), **sample data** (hardcoded, not saved), **spec only** (described, no route), **code without a spec** (route exists, no module spec).

The `sample-data` middleware is `App\Http\Middleware\MarkSampleData`, aliased in `backend/bootstrap/app.php`. It wraps all of `/api/v1/staff/*`, plus `/api/v1/student/materials`, `/api/v1/student/assignments`, and `/api/v1/student/notifications`.

## Implemented and covered by a spec

| Area | Routes | Spec |
|---|---|---|
| Student self-service through readiness | `/api/v1/students/me` (profile, photo, skills, education, resumes, interviews, recommendations, readiness-score) and `/api/v1/interviews/{interview}` | `documentation/student-journey-backend-spec.md` steps 1–11; `documentation/ai-interview-journey-backend-spec.md` |
| Academic results pipeline | `/api/v1/grade-rules`, `/api/v1/mark-schemes`, `/api/v1/mark-entries`, `/api/v1/mark-review`, `/api/v1/result-publishing`, `/api/v1/student/results`, `/api/v1/students/{student}/academic-summary` | `documentation/academic-results-backend-spec.md` |
| Placement officer core drives, statistics & reports | `/api/v1/placement/*` and `/api/v1/staff/placement/*` (`drives`, `applications`, `statistics`, `results-by-batch`, `report`) | `documentation/placement-officer-journey-backend-spec.md` steps 1–3, 13 |
| Apply to a company | `POST /api/v1/companies/{company}/apply` | Student journey step 13, only this call. Steps 12 and 14–16 are spec only. |

## Implemented, no module spec

These routes persist. `backend/ARCHITECTURE.md` still lists several of their controllers as not yet moved to Actions and FormRequests (`CourseController`, `SubjectController`, `SemesterController`, `DepartmentController`, `DesignationController`, `AttendanceController`, `PermissionController`).

| Area | Routes | Controller |
|---|---|---|
| Auth and session | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, `PUT /api/v1/auth/profile` | `Api\V1\AuthController` |
| Campus bootstrap | `GET /api/v1/campus/bootstrap`, `POST /api/v1/campus/reset`, `GET /api/v1/reports/summary` | `Api\V1\CampusController` |
| Masters | `/api/v1/masters` | `Api\V1\MasterOptionController` |
| Courses | `/api/v1/courses` and `/api/v1/courses/list/*` | `Api\V1\CourseController` |
| Subjects | `/api/v1/subjects` and `/api/v1/subjects/list/courses` | `Api\V1\SubjectController` |
| Semesters | `/api/v1/semesters` and `/api/v1/semesters/list/*` | `Api\V1\SemesterController` |
| Departments | `/api/v1/departments` | `Api\V1\DepartmentController` |
| Designations | `/api/v1/designations` | `Api\V1\DesignationController` |
| Students and staff CRUD | `/api/v1/students`, `/api/v1/staff` | `Api\V1\StudentController`, `Api\V1\StaffController` |
| Companies (flat row) | `/api/v1/companies` | `Api\V1\CompanyController` |
| Announcements | `/api/v1/announcements` | `Api\V1\AnnouncementController` |
| Permissions | `/api/v1/permissions`, `/api/v1/permissions/roles/*` | `PermissionController` |
| Attendance | `/api/v1/attendance` (`mark`, subject students, student report, subject report, approve) | `AttendanceController` |
| Student reads | `/api/v1/student/attendance`, `/api/v1/student/marks`, `/api/v1/student/timetable` | `Api\Student\AttendanceController`, `MarksController`, `TimetableController` |

`documentation/prd/campus-academics-module.md` section A9 names the attendance and student timetable reads as endpoints that stay. It does not specify courses, subjects, semesters, departments, designations, masters, announcements, or permissions.

Student marks here are `Api\Student\MarksController` (`/api/v1/student/marks`). Published grade cards are a different API: `/api/v1/student/results`.

## Specified and not built

The journey specs already describe the target. This table only points at them.

| Gap | Evidence | Spec |
|---|---|---|
| Placement officer steps 4–12 | `/api/v1/placement` and `/api/v1/staff/placement` core drives, statistics, and reports persist and query live DB. Advanced eligibility rule engine, sequential round scheduling, and formal offer letters remain to be implemented. | `documentation/placement-officer-journey-backend-spec.md` |
| Recruiter steps 1–10 | `UserRole::Recruiter` exists. No recruiter route group. | `documentation/recruiter-journey-backend-spec.md` |
| Student placement steps 12, 14–16 | No job-match, assessment-round, interview-round, or placement-record routes. Only `POST /api/v1/companies/{company}/apply`. | `documentation/student-journey-backend-spec.md` |
| Classes, batches, subject allocations | No `/batches`, `/classes`, or `/subject-allocations` routes. | Campus academics A9 "To add" |
| Timetable CRUD | Student read exists (`/api/v1/student/timetable`). No `/timetables` write API. | Campus academics A9 |
| Exam CRUD | `/api/v1/staff/exam` is `sample-data`. No `/exam-types` or `/exams` resource. | Campus academics A9 |
| Revaluation | No `/revaluations` routes. | Campus academics A9 |
| Fees | No `/fee-structures`, `/student-fees`, or `/student/fees` routes. | Campus academics A9 |

## Duplicate paths

The same job is exposed twice. The first path persists. The second is `sample-data` and is what several React screens call.

| Job | Persisted route | Sample route |
|---|---|---|
| Mark attendance | `POST /api/v1/attendance/mark` and `GET /api/v1/attendance/subject/{subject}/students` (roster is the course's classes for that subject's semester; `roll_number` in the JSON is `students.registration_number`). `GET /api/v1/attendance/subjects` lists subjects for staff who can mark attendance. | `POST /api/v1/staff/attendance/submit` |
| Enter marks | `POST /api/v1/mark-entries/save-draft` and `POST /api/v1/mark-entries/submit` | `POST /api/v1/staff/marks/submit` |
| Staff directory | `/api/v1/staff` | `/api/v1/staff/management` |
| Department stats | `GET /api/v1/departments/{department}/stats` (computes live `total_students`, `total_faculty`, `average_cgpa`, `placement_rate`; used by `DepartmentOverview.tsx`). | `GET /api/v1/staff/department/overview` |

Also sample-only, with no persisted twin: `/api/v1/staff/exam`, `/api/v1/staff/reports`, `/api/v1/student/materials`, `/api/v1/student/assignments`, `/api/v1/student/notifications`. Placement routes (`/api/v1/placement` and `/api/v1/staff/placement`) now query real DB tables and are outside `sample-data`. Academic years select endpoint `GET /api/v1/semesters/list/academic-years` now queries live `academic_years` rows and feeds `AcademicYearModule.tsx`.

## Controllers still on the old style

From `backend/ARCHITECTURE.md`, these still validate and write inside the controller: `CourseController`, `SubjectController`, `SemesterController`, `DepartmentController`, `DesignationController`, `AttendanceController`, `PermissionController`, `Api\Staff\*`, and `Api\Student\MaterialsController` / `NotificationsController`. The staff and materials controllers are sample data, so moving them is not the same as implementing the module.
