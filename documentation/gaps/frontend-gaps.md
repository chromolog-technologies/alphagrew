# Frontend gaps

Recorded 21 October 2026 by reading `frontend/src/components/layouts/CampusWorkspace.tsx` (`renderTabContent`), the API clients, and each screen's imports. The live shell is Campus workspace. `RoleBasedSidebar.tsx` is exported from `components/layouts/index.ts` and is not mounted.

A screen is **persisted** only when its write hits a Laravel route outside the `sample-data` group. Component-local `useState` resets on reload. Sample-data responses are not saved. Express routes in `frontend/server.ts` are a second database (`frontend/src/db.ts`) and are not the Laravel API.

`VITE_API_BASE_URL` is the Laravel prefix (the clients append paths such as `/courses` and `/student/attendance`). Root-relative `fetch('/api/...')` goes to the Express server.

## Mounted screens

| Tab | Component | Source | Laravel or other path | Persisted |
|---|---|---|---|---|
| `dashboard`, `activity`, `masters`, `students`, `staff`, `designations`, `placement`, `announcements`, `reports`, `profile` | Rendered inside `CampusWorkspace.tsx` | Campus dataset. `App.tsx` loads it with `loginWithCampusApi` / `fetchCampusBootstrap` and keeps a copy in `localStorage`. | `/api/v1/auth/*`, `/api/v1/campus/bootstrap`, and the students, staff, masters, companies, announcements, and resume calls in `campusApi.ts` | Yes, when `VITE_API_BASE_URL` is set. Demo reset uses `POST /api/v1/campus/reset`. |
| `departments` | `components/admin/DepartmentsModule.tsx` | `apiClient` | `/api/v1/departments` (client path `/departments`, plus list helpers) | Yes |
| `courses` | `components/admin/CoursesModule.tsx` | `apiClient` `courseApi` | `/courses`, `/courses/list/departments`, `/courses/list/select` | Yes |
| `subjects` | `components/admin/SubjectsModule.tsx` | `apiClient` `subjectApi` | `/subjects`, `/subjects/list/courses` | Yes |
| `academic_years` | `components/admin/AcademicYearModule.tsx` | `apiClient` `semesterApi` | `/semesters/list/academic-years` | Yes, reads live academic years from database. |
| `timetable` | `components/admin/TimetableModule.tsx` | Hardcoded `useState` | None. No timetable write API. | No |
| `classes` | `components/admin/ClassesModule.tsx` | Hardcoded `useState` | None. No classes API. | No |
| `roles` | `components/admin/RolesPermissionsModule.tsx` | `apiClient` | `/permissions/roles/all` | Yes, reads live roles from database. |
| `marks` (admin and staff) | `components/admin/MarksModule.tsx` | `campusApi` | `/api/v1/grade-rules`, `/api/v1/mark-schemes`, `/api/v1/mark-entries`, `/api/v1/mark-review`, `/api/v1/result-publishing` | Yes. Full 4-tab lifecycle (Faculty Draft & Submit, HOD Review & Moderation Queue, Semester Publishing with Pre-flight Gatekeeper & Unlock, and Grade Scales/Schemes). |
| `marks` (student) | `components/student/StudentMarksView.tsx` | `campusApi` | `/student/marks`, `/api/v1/student/results/semesters`, `/api/v1/student/results/semester/{id}`, `/api/v1/student/results/all`, `/api/v1/student/results/summary` | Yes. Stage 6 official published grade cards with SGPA/CGPA, credits earned, active backlogs, plus continuous assessment tests. |
| `profile` (student) | `components/student/StudentCareerProfile.tsx` | `campusApi` | `/api/v1/students/me/profile`, `/api/v1/students/me/academics`, `/api/v1/students/me/education`, `/api/v1/students/me/skills`, `/api/v1/skills`, `/api/v1/students/me/projects`, `/api/v1/students/me/certifications`, `/api/v1/students/me/experience` | Yes. Live career profile, completeness tracking, recruiter visibility controls, prior education history, skills catalogue with level ratings, and projects. |
| `settings` | `components/admin/SystemSettingsModule.tsx` | Hardcoded `useState` | None | No |
| `department_overview` | `components/staff/DepartmentOverview.tsx` | Direct `fetch` to `VITE_API_BASE_URL` | `/departments`, `/departments/{id}/stats` | Yes, reads live department statistics. Fallback to sample data if offline. |
| `hod_staff_management` | `components/staff/HODStaffManagement.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/management` | No (sample data). Real staff CRUD is the `staff` tab. |
| `hod_reports` | `components/staff/HODReportsAnalytics.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/reports/*` | No (sample data) |
| `placement_officer` | `components/staff/PlacementOfficerModule.tsx` | `campusApi` | `/staff/placement/drives`, `/staff/placement/statistics`, `POST /staff/placement/drives`, `PUT /staff/placement/drives/{id}` | Yes. Reads live database records, uses `chromolog-campus-auth`, persists drives & jobs, and manages status transitions. |
| `exam_coordinator` | `components/staff/ExamCoordinatorModule.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/exam` | No (sample data) |
| `student_timetable` | `components/student/StudentTimetableView.tsx` | `campusApi` | `/student/timetable`, `/student/timetable/day` | Read-only. Writes are not implemented. |
| `student_assignments` | `components/student/StudentAssignmentsMaterials.tsx` | `campusApi`, shows `PrototypeNotice` | `/student/materials`, `/student/assignments` | No (sample data) |
| `student_notifications` | `components/student/StudentNotifications.tsx` | `campusApi`, shows `PrototypeNotice` | `/student/notifications` | No (sample data) |
| `attendance` (student) | `components/student/StudentAttendanceView.tsx` | `campusApi` | `/student/attendance`, `/student/attendance/detailed` | Read of the real attendance API |
| `attendance` (staff and admin) | `components/staff/AttendanceModule.tsx` (`AttendanceMarkForm`, `AttendanceReport`) | Direct `fetch` to `VITE_API_BASE_URL` | `GET /attendance/subjects`, `GET /attendance/subject/{id}/students`, `POST /attendance/mark` | Yes. The sample `AttendanceMarking` screen is no longer mounted. |

Student apply-to-company on the placement views inside `CampusWorkspace` calls `applyToCompany`, which uses `POST /companies/{id}/apply` through `campusApi.ts`. That write is persisted. Job matching, rounds, and offers are not on these screens.

The student profile and resume editors inside `CampusWorkspace` call `updateStudentResumeWithCampusApi` (`PUT /students/me/resume`). The typed client methods `resumeApi` and `interviewApi` are now declared in `frontend/src/api/campusApi.ts` connecting to `/api/v1/students/me/resumes`, `/api/v1/students/me/interviews`, and `/api/v1/interviews/{id}/*`. Dedicated frontend UI screens for mock interview sessions and readiness scorecards remain to be mounted in `CampusWorkspace.tsx`.

## Unmounted screens

These files exist and are not rendered by `CampusWorkspace`. `AdminDashboard` would mount `DesignationsModule` and the Express admin calls, but nothing imports `AdminDashboard`.

| Component | Source | Path | Note |
|---|---|---|---|
| `components/admin/AdminDashboard.tsx` | Express `fetch('/api/...')` | `/api/analytics/overview`, `/api/admin/students`, `/api/admin/applications`, `/api/admin/questions`, `/api/jobs` | Orphan. Laravel has none of these paths. |
| `components/admin/DesignationsModule.tsx` | `apiClient` | Would call Laravel designation routes | API client is real. The mounted designations tab does not use this component. It uses the campus dataset in `CampusWorkspace`. |
| `components/student/StudentDashboard.tsx` | Express | `/api/jobs`, `/api/students/:id`, `/api/admin/questions`, `/api/applications`, `/api/test-attempts` | Orphan |
| `components/staff/TPODashboard.tsx` | Express | `/api/analytics/overview` | Orphan |
| `components/staff/RecruiterDashboard.tsx` | Express | `/api/jobs`, `/api/companies/:userId`, `/api/ai/extract-jd` | Orphan. No Laravel recruiter API. |
| `components/staff/StaffDashboard.tsx` | `campusApi` | `/staff/management/{id}/workload`, `/staff/department/overview`, `/staff/placement/statistics` | Sample data. The mounted staff dashboard is `renderStaffDashboard` inside `CampusWorkspace`. |
| `components/staff/MarksEntry.tsx` | `campusApi` | `/staff/marks/*` | Sample data. Not the `/mark-entries` pipeline. |
| `components/staff/AttendanceModule.tsx` | `AttendanceMarkForm` and `AttendanceReport` | `/attendance/*` | Mounted on the `attendance` tab for staff and admin. |
| `components/staff/AttendanceMarkForm.tsx` | Direct `fetch` to `VITE_API_BASE_URL` | `/attendance/subjects`, `/attendance/subject/{id}/students`, `POST /attendance/mark` | Real attendance API. Mounted from `AttendanceModule` on the `attendance` tab. |
| `components/student/StudentMarksView.tsx` | `campusApi` | `/student/marks`, `/api/v1/student/results/*` | Real read mounted on `marks` tab for students, providing both continuous assessment marks and official published semester grade cards. |

## Two clients and a third server

- `frontend/src/api/apiClient.ts` reads the bearer token from `localStorage` key `chromolog-campus-auth` and calls Laravel. Used by courses, subjects, departments, roles, academic years (`semesterApi`), and the unmounted designations module.
- `frontend/src/api/campusApi.ts` is the larger Laravel client. It includes both persisted campus routes and every `sample-data` staff and student route.
- `frontend/server.ts` plus `frontend/src/db.ts` is an Express and SQLite app. Only the unmounted dashboards call it. The running workspace does not.
