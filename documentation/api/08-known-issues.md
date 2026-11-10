# Known issues found while documenting

Each item was found by reading the code while writing this reference. None has been fixed. Severity is a judgement of user impact.

## Defects

| # | Severity | Endpoint | Problem | Effect |
|---|---|---|---|---|
| 1 | High | `GET /student/attendance`, `/student/attendance/detailed`, `/student/attendance/statistics` | The controller filters `attendance.student_id` by the signed-in **user** id instead of the linked student id. | A student sees another student's attendance, or none. |
| 2 | High | `GET /student/timetable`, `/student/timetable/day` | The controller reads `class_id` from the user, but the `users` table has no such column. | Always answers 404 `Student class not found`. |
| 3 | Medium | `GET /attendance/student/{studentId}/report` | The own-report check compares the path value (a string) to the student id (an integer) with `!==`. | Students always get 403, even for their own report. |
| 4 | Medium | `GET /attendance`, `PUT /attendance/{id}` | The "own subjects only" rule checks for a `faculty` role that does not exist. Staff hold the `staff` role. | Staff see every attendance record in the institution. |
| 5 | Medium | `GET /student/notifications/preferences`, `PUT /student/notifications/preferences` | The routes need `notifications.manage`, which the student role does not have. | Students always get 403. |
| 6 | Medium | `POST /departments`, `PUT /departments/{id}`, `POST /designations`, `PUT /designations/{id}` | Some rules use plain `unique:` and `exists:` instead of the tenant-aware rule: department `code` and `hod_id` on create, `hod_id` on update, designation `name`, `slug` and `department_id` on create, `department_id` on update. | A code or name used by **another institution** blocks this one, and ids from another institution pass validation. |
| 7 | Low | `GET /subjects/list/courses` | Returns `duration_years`, a column that course create and update never write (they write `duration_value` and `duration_type`). | The field is always `null`. |
| 8 | Low | `GET /courses/list/staff`, `GET /departments/list/hod-options` | Filter on a `hod` role that does not exist. Hod options build the name from `first_name` and `last_name`, which can be empty. | Harmless extra filter. Names can come back blank. |
| 9 | Low | `PUT /students/me/resume` | A write guarded by `profile.view`, not `profile.edit`. | Inconsistent with the other `/students/me` writes. Students hold both today. |
| 10 | Low | `GET /staff/reports/*`, `GET /staff/exam/report`, `GET /staff/marks/template`, `GET /staff/placement/report` | Return a `download_url` for a route that does not exist. | Following the link gives 404. |

Issues 1–10 were re-checked on 10 November 2026 and are all still present.

## Frontend calls that do not match the backend

Found on 10 November 2026 by matching every frontend call against the route table. See [10-frontend-coverage.md](10-frontend-coverage.md) for screens without an API, and APIs without a screen.

| # | Severity | Where | Problem | Effect |
|---|---|---|---|---|
| 11 | Low | `marksApi.entrySheet` in `frontend/src/api/marksApi.ts` | Sends `POST /mark-entries/get-students`. The route is `GET`. | 405. Not reached today: only the unmounted `MarksWorkflowModule` uses it. |
| 12 | Low | `marksApi.semesterSubjects` | Calls `/mark-schemes/semester/{id}/subjects`, which does not exist. | 404, same unmounted screen. |
| 13 | Low | `marksApi.reviewQueue` | Calls `/mark-review/submitted`. The route is `/mark-review/get-submitted-marks`. | 404, same unmounted screen. |
| 14 | Low | `frontend/src/components/admin/AdminDashboard.tsx` | Fetches `/api/analytics/overview`, `/api/admin/*` and `/api/jobs`, which do not exist. | None today: the component is exported but never rendered. |

**Fixed on 10 November 2026.** Merge `fd6ad58` damaged two things:
- `GET /exams` disappeared from `routes/api.php`, although the controller, the docs and the Marks screens still used it. It is restored and covered by `MarkEntryTest`.
- The `request()` helper in `frontend/src/api/campusApi.ts` lost its `if (!response.ok)` line, so **every** call through it threw an error, even on success. That included sign-in and the startup data load in live API mode. It is restored and covered by `campusApi.test.ts`.

The same day, `request()` and `apiCall()` started sending `Accept: application/json`. Without it a validation error came back as a redirect, so the app showed a generic failure instead of the server's message.

Faculty mark entry now has a screen (Marks → Enter Marks). Issues 11–13 remain in the older, unmounted `MarksWorkflowModule`.

## Gaps and risks

- **Recruiter data exposure is latent.** The student visibility rule has no case for recruiters, so a recruiter would receive every student in `GET /campus/bootstrap`. Recruiters cannot sign in today, so nothing leaks yet. Add a recruiter rule before enabling that portal.
- **Staff without a department see all students.** The staff filter only applies when `users.department_code` is set.
- **Placement policy is stored but not enforced.** `POST /companies/{company}/apply` ignores the one-offer rule, application cap and profile minimum.
- **Two drive APIs over one table.** `/companies` stores lower-case status codes (`open`). `/staff/placement/drives` stores capitalised ones (`Open`) and defaults `type` to `Placement`. Output is normalised, but filters such as `GET /staff/placement/drives?status=` depend on what was stored.
- **Two marks systems.** `/student/marks` and `/staff/marks/*` use the older `marks` table or sample data. The results module (`/mark-entries`, `/student/results`) is the real lifecycle.
- **No API for exams, exam types, academic years, classes, timetables or subject allocations.** Exams can only be listed (`GET /exams`). Mark entry requires subject allocations, which can currently only be seeded. The demo seeder (`AcademicDemoSeeder`) creates them.
- **Custom field values have a form for students only.** Staff, subject and exam values can be set through `PUT /custom-fields/values/{entity}/{id}` only.
- **54 sample-data endpoints.** Front-end screens built on them will show the same fixed data for every user.
- **Inconsistent conventions.** Envelopes, field casing and pagination parameter names differ between modules (see [README.md](README.md#5-response-conventions)). Consider settling on camelCase resources with `{ data, meta }` for new work.
