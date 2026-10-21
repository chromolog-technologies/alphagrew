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
| `academic_years` | `components/admin/AcademicYearModule.tsx` | Hardcoded `useState` | None. `semesterApi` in `apiClient.ts` is unused by this screen. | No |
| `timetable` | `components/admin/TimetableModule.tsx` | Hardcoded `useState` | None. No timetable write API. | No |
| `classes` | `components/admin/ClassesModule.tsx` | Hardcoded `useState` | None. No classes API. | No |
| `roles` | `components/admin/RolesPermissionsModule.tsx` | Hardcoded `useState` | None. `hooks/usePermissions.ts` calls `/permissions/all`, and only the unmounted sidebar, `AttendanceModule`, and `ProtectedRoute` use that hook. | No |
| `exams` | `components/admin/ExamsModule.tsx` | Hardcoded `useState` | None. The sample exam API is a different screen. | No |
| `marks` | `components/admin/MarksModule.tsx` | Hardcoded `useState` | None. The real pipeline is `/api/v1/mark-entries`, which no screen calls. | No |
| `fees` | `components/admin/FeesModule.tsx` | Hardcoded `useState` | None. No fees API. | No |
| `settings` | `components/admin/SystemSettingsModule.tsx` | Hardcoded `useState` | None | No |
| `department_overview` | `components/staff/DepartmentOverview.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/department/overview`, `/performance`, `/budget` | No (sample data) |
| `hod_staff_management` | `components/staff/HODStaffManagement.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/management` | No (sample data). Real staff CRUD is the `staff` tab. |
| `hod_reports` | `components/staff/HODReportsAnalytics.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/reports/*` | No (sample data) |
| `placement_officer` | `components/staff/PlacementOfficerModule.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/placement/drives`, `/staff/placement/statistics` | No (sample data). The `placement` tab uses the flat `/companies` API instead. |
| `exam_coordinator` | `components/staff/ExamCoordinatorModule.tsx` | `campusApi`, shows `PrototypeNotice` | `/staff/exam` | No (sample data) |
| `student_timetable` | `components/student/StudentTimetableView.tsx` | `campusApi` | `/student/timetable`, `/student/timetable/day` | Read-only. Writes are not implemented. |
| `student_assignments` | `components/student/StudentAssignmentsMaterials.tsx` | `campusApi`, shows `PrototypeNotice` | `/student/materials`, `/student/assignments` | No (sample data) |
| `student_notifications` | `components/student/StudentNotifications.tsx` | `campusApi`, shows `PrototypeNotice` | `/student/notifications` | No (sample data) |
| `attendance` (student) | `components/student/StudentAttendanceView.tsx` | `campusApi` | `/student/attendance`, `/student/attendance/detailed` | Read of the real attendance API |
| `attendance` (staff and admin) | `components/staff/AttendanceModule.tsx` (`AttendanceMarkForm`, `AttendanceReport`) | Direct `fetch` to `VITE_API_BASE_URL` | `GET /attendance/subjects`, `GET /attendance/subject/{id}/students`, `POST /attendance/mark` | Yes. The sample `AttendanceMarking` screen is no longer mounted. |

Student apply-to-company on the placement views inside `CampusWorkspace` calls `applyToCompany`, which uses `POST /companies/{id}/apply` through `campusApi.ts`. That write is persisted. Job matching, rounds, and offers are not on these screens.

The student profile and resume editors inside `CampusWorkspace` call `updateStudentResumeWithCampusApi` (`PUT /students/me/resume`). The newer `/students/me/profile`, skills, education, resumes, and interview routes have no dedicated screen.

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
| `components/staff/AttendanceReport.tsx` | Direct `fetch` to `VITE_API_BASE_URL` | `/attendance/student/{id}/report`, `/attendance/subject/{id}/report` | Real attendance API. Mounted from `AttendanceModule`. The report still needs a student or subject id from its props. |
| `components/student/StudentMarksView.tsx` | `campusApi` | `/student/marks` | Real read, different from `/student/results`. Not mounted. |
| `components/layouts/RoleBasedSidebar.tsx` | `usePermissions` | `/permissions/all` | Not mounted. Navigation is the workspace tab list. |

## Two clients and a third server

- `frontend/src/api/apiClient.ts` reads the bearer token from `localStorage` key `chromolog-campus-auth` and calls Laravel. Used by courses, subjects, departments, and the unmounted designations module. `semesterApi` has no screen.
- `frontend/src/api/campusApi.ts` is the larger Laravel client. It includes both persisted campus routes and every `sample-data` staff and student route.
- `frontend/server.ts` plus `frontend/src/db.ts` is an Express and SQLite app. Only the unmounted dashboards call it. The running workspace does not.
