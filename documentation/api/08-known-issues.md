# Known issues found while documenting

Each item was found by reading the code while writing this reference. Severity is a judgement of user impact; the Status column says what has been fixed.

## Defects

Re-checked on 11 November 2026 against the code after merging `origin/main` (`21c5c92`).

| # | Severity | Endpoint | Problem | Status |
|---|---|---|---|---|
| 1 | High | `GET /student/attendance*` | Filtered by the user id instead of the linked student id. | **Fixed** upstream (`eef2406`): resolves the student id from the signed-in user. |
| 2 | High | `GET /student/timetable*` | Read a `class_id` the `users` table does not have. | **Fixed** upstream (`eef2406`). |
| 3 | Medium | `GET /attendance/student/{studentId}/report` | String vs integer comparison refused a student's own report. | **Fixed** upstream (`eef2406`). |
| 4 | Medium | `GET /attendance`, `PUT /attendance/{id}` | "Own subjects only" checked a `faculty` role that does not exist. | **Fixed** upstream (`eef2406`). |
| 5 | Medium | `/student/notifications/preferences` | Needed a permission students lack. | **Fixed**: replaced by `/notifications/preferences` for every role. |
| 6 | Medium | Department and designation create/update | Plain `unique:`/`exists:` rules ignored the tenant. | **Fixed** upstream: tenant-aware rules. |
| 7 | Low | `GET /subjects/list/courses` | Returned `duration_years`, a column never written. | **Fixed** 11 Nov 2026: returns `duration_value`, `duration_type` and a derived `duration_years`. |
| 8 | Low | `GET /courses/list/staff`, `GET /departments/list/hod-options` | Filtered on a `hod` role that does not exist; names could be blank. | **Fixed** 11 Nov 2026: staff only; name falls back to the full name. |
| 9 | Low | `PUT /students/me/resume` | A write guarded by `profile.view`. | **Fixed** 11 Nov 2026: needs `profile.edit` (students hold it). |
| 10 | Low | `GET /staff/reports/*`, `/staff/exam/report`, `/staff/marks/template`, `/staff/placement/report` | Return a `download_url` for a route that does not exist. | **Open.** Most are sample-data endpoints; downloadable reports are not built. |

## Frontend calls that do not match the backend

Issues 11–14 (`marksApi.entrySheet`, `semesterSubjects` and `reviewQueue`, and `AdminDashboard`'s calls to `/api/analytics/*`, `/api/admin/*` and `/api/jobs`) are **resolved by removal** on 11 November 2026: `MarksWorkflowModule`, its panels, `marksApi.ts`, `AdminDashboard` and `StudentDashboard` were never rendered and have been deleted.

**Fixed on 10 November 2026.** Merge `fd6ad58` damaged two things:
- `GET /exams` disappeared from `routes/api.php`, although the controller, the docs and the Marks screens still used it. It is restored and covered by `MarkEntryTest`.
- The `request()` helper in `frontend/src/api/campusApi.ts` lost its `if (!response.ok)` line, so **every** call through it threw an error, even on success. That included sign-in and the startup data load in live API mode. It is restored and covered by `campusApi.test.ts`.

The same day, `request()` and `apiCall()` started sending `Accept: application/json`. Without it a validation error came back as a redirect, so the app showed a generic failure instead of the server's message.

Faculty mark entry now has a screen (Marks → Enter Marks). Issues 11–13 remain in the older, unmounted `MarksWorkflowModule`.

## Gaps and risks

- **Recruiter data exposure is latent.** The student visibility rule has no case for recruiters, so a recruiter would receive every student in `GET /campus/bootstrap`. Recruiters cannot sign in today, so nothing leaks yet. Add a recruiter rule before enabling that portal.
- **Staff without a department see all students.** The staff filter only applies when `users.department_code` is set.
- ~~Placement policy is stored but not enforced.~~ Fixed 11 November 2026: one-offer, dream offer, offer deadline, application cap, profile minimum, opt-out and debarment are enforced on every apply. `debarOnRenege` is stored but not enforced: there is no "accept, then back out" action.
- **Two drive APIs over one table** (offline demo screens only since 11 November 2026; the live app uses `/placement/*`). The old `/companies` and `/staff/placement/drives|applications` endpoints now send `Deprecation: true` and `Link: <…/placement/jobs>; rel="successor-version"`. `/companies` stores lower-case status codes (`open`). `/staff/placement/drives` stores capitalised ones (`Open`) and defaults `type` to `Placement`. Output is normalised, but filters such as `GET /staff/placement/drives?status=` depend on what was stored.
- **Two marks systems.** `/student/marks` and `/staff/marks/*` use the older `marks` table or sample data, and are marked deprecated (successors `/student/results/all` and `/mark-entries`). The results module is the real lifecycle.
- **No API for exams, exam types, academic years, classes, timetables or subject allocations.** Exams can only be listed (`GET /exams`). Mark entry requires subject allocations, which can currently only be seeded. The demo seeder (`AcademicDemoSeeder`) creates them.
- **Custom field values have a form for students only.** Staff, subject and exam values can be set through `PUT /custom-fields/values/{entity}/{id}` only.
- **45 sample-data endpoints** (counted 11 November 2026). Responses carry `X-Data-Source: sample`; the workspace now shows a "Prototype screen" notice automatically on any screen that receives one (`SampleDataNotice`), and CORS exposes the header for cross-origin deployments.
- **Inconsistent conventions.** Envelopes, field casing and pagination parameter names differ between modules (see [README.md](README.md#5-response-conventions)). Consider settling on camelCase resources with `{ data, meta }` for new work.
