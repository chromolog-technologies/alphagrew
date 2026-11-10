# AlphaGrew Campus API Reference

This folder documents every HTTP endpoint the Laravel backend in `backend/` exposes, for all six account types. It was written by reading the route table (`php artisan route:list`), every controller, form request, API resource and action, and the permission seeders.

| File | Covers |
|---|---|
| [README.md](README.md) | Conventions, headers, auth, errors, rate limits, roles, and the full endpoint index |
| [01-auth-and-account.md](01-auth-and-account.md) | Login, registration, profile, sessions, password reset, email verification, invitation acceptance |
| [02-institution-setup.md](02-institution-setup.md) | Campus dataset, institution settings, campuses, batches, departments, courses, subjects, semesters, designations, masters, permissions, audit logs, announcements |
| [03-people.md](03-people.md) | Students (admin side), staff accounts, invitations, registration approvals |
| [04-academics-and-results.md](04-academics-and-results.md) | Exams, grade rules, mark schemes, mark entry, mark review, result publishing, student academics (staff side) |
| [05-placement.md](05-placement.md) | Companies and drives, applying, placement policy, staff placement endpoints |
| [06-student-portal.md](06-student-portal.md) | Everything under `/students/me`, `/student/*`, resumes, AI interviews, readiness, signed file URLs |
| [07-staff-portal-and-attendance.md](07-staff-portal-and-attendance.md) | `/staff/*` portal endpoints (mostly sample data) and the attendance module |
| [08-known-issues.md](08-known-issues.md) | Defects and gaps found while documenting |

> **Regenerating the index.** The endpoint table at the bottom of this file is generated from the live route table. If routes change, re-run `php artisan route:list --path=api --json` and update the table, or ask for this reference to be refreshed.

---

## 1. Base URL and versioning

| Environment | Base URL |
|---|---|
| Local (XAMPP / `php artisan serve`) | `http://localhost:8000/api/v1` |
| Configured app URL | `${APP_URL}/api/v1` |

All application endpoints live under `/api/v1`. The only other routes are `GET /` (Laravel welcome page) and `GET /up` (health check, returns HTTP 200 when the app boots).

Paths in the per-module files are written relative to `/api/v1`, for example `POST /auth/login` means `POST {APP_URL}/api/v1/auth/login`.

## 2. Request headers

| Header | When | Value |
|---|---|---|
| `Accept` | **Always** | `application/json` |
| `Content-Type` | JSON bodies | `application/json` |
| `Content-Type` | File uploads | `multipart/form-data` (let the HTTP client set the boundary) |
| `Authorization` | Every endpoint marked **Bearer** | `Bearer <token>` |

`Accept: application/json` is required, not optional. Without it Laravel treats the call as a browser request. A failed validation then redirects instead of returning 422, and an unauthenticated call tries to redirect to a `login` route that does not exist and fails with HTTP 500.

**Uploads with PUT.** PHP does not parse `multipart/form-data` on `PUT`. To send a file to a `PUT` endpoint (for example a staff photo on `PUT /staff/{staff}`), send `POST` with an extra form field `_method=PUT`.

### Response headers worth knowing

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit`, `X-RateLimit-Remaining` | Present on throttled routes |
| `Retry-After` | Seconds to wait, sent with HTTP 429 |
| `X-Data-Source: sample` | The controller returns **hardcoded sample data**, not database records. See section 9. |

## 3. Authentication

The API uses **Laravel Sanctum personal access tokens** (bearer tokens, not cookies).

1. Call `POST /auth/login` (or accept an invitation with `POST /invitations/accept/{token}`).
2. Read `token` from the response. It looks like `12|Xyz...`.
3. Send it on every protected call as `Authorization: Bearer 12|Xyz...`.
4. Call `POST /auth/logout` to revoke the current token.

| Property | Value |
|---|---|
| Token lifetime | `SANCTUM_EXPIRATION` minutes, default **720** (12 hours) from creation |
| Token name | The caller's `User-Agent`, cut to 40 characters (shown as `device` in `GET /auth/sessions`) |
| Token abilities | The user's effective permission names |
| Password change / reset | Changing the password signs out every other device. A reset signs out every device. |
| Account lockout | 10 wrong passwords lock the account for 15 minutes (HTTP 423) |

### Tenancy

Every authenticated route runs the `SetTenant` middleware after authentication:

- **Super Admin** bypasses tenant scoping and sees every institution's rows.
- **Every other user** is scoped to their own `institution_id`. A user without one gets HTTP 403 `Your account is not linked to an institution.`
- Route-model binding (`{student}`, `{company}`, …) is tenant-scoped, so another institution's id answers **404**, never 403.

### Signed URLs

Two file endpoints use Laravel signed URLs instead of a bearer token, so `<img>` and download links work without headers. The API hands out these URLs; clients never build them.

| Endpoint | Issued by | Lifetime |
|---|---|---|
| `GET /files/student-photos/{student}` | `photoUrl` in the student profile | 10 minutes |
| `GET /files/resumes/{resume}` | `GET /students/me/resumes/{resume}/download` | 5 minutes |
| `GET /auth/email/verify/{id}/{hash}` | Verification email | Laravel default (60 minutes) |

An expired or tampered signature returns HTTP 403 `Invalid signature.`

## 4. Roles and permissions

### Account types

| Code | Role (`users.role`) | Portal | Institution |
|---|---|---|---|
| SA | `super_admin` | Admin | None, platform-wide |
| IA | `institution_admin` | Admin | Required |
| PO | `placement_officer` | Staff | Required |
| STF | `staff` | Staff | Required |
| STU | `student` | Student | Required |
| REC | `recruiter` | None yet | None. Login is refused with HTTP 403 until the recruiter portal ships. |

Access is decided in three layers:

1. **Route permission.** Each protected route names one Spatie permission (guard `sanctum`). Missing it returns HTTP 403 `User does not have the right permissions.`
2. **Role base permissions.** Each role gets a fixed set, listed below. Admins also pass every policy check (`Gate::before`).
3. **Designations.** Staff and placement officers additionally receive their designation's permissions. A designation can grant any permission in the catalogue.

### Base permissions per role

| Role | Permissions |
|---|---|
| Super Admin, Institution Admin | All 101 permissions |
| Placement Officer | `dashboard.view`, `profile.view`, `students.view`, `students.view_all`, `results.view_summary`, `departments.view`, `courses.view`, `companies.view`, `companies.create`, `companies.edit`, `companies.delete`, `placement.view`, `placement.create`, `placement.manage`, `placement.schedule_round`, `placement.view_results`, `placement.publish_results`, `announcements.view`, `announcements.create`, `reports.view` |
| Staff | `dashboard.view`, `profile.view`, `attendance.view`, `attendance.mark`, `marks.view`, `marks.create`, `marks.edit`, `timetable.view`, `classes.view`, `students.view`, `courses.view` |
| Student | `dashboard.view`, `profile.view`, `profile.edit`, `placement.view`, `placement.apply`, `announcements.view`, `timetable.view`, `materials.view`, `assignments.view`, `assignments.submit`, `marks.view`, `attendance.view`, `notifications.view`, `resumes.manage`, `interviews.practice` |
| Recruiter | `dashboard.view`, `profile.view` |

### Seeded designation presets

| Designation | Adds |
|---|---|
| Head of Department | `students.view`, `students.create`, `departments.view`, `marks.view`, `marks.create`, `marks.approve`, `announcements.view`, `reports.view` |
| Exam Coordinator | `students.view`, `departments.view`, `marks.view`, `marks.create`, `marks.approve`, `marks.publish`, `announcements.view`, `announcements.create`, `reports.view` |
| Department Coordinator | `students.view`, `students.create`, `placement.view`, `placement.create`, `announcements.view`, `announcements.create`, `reports.view` |
| HR | `students.view`, `placement.view`, `placement.create`, `announcements.view`, `announcements.create`, `reports.view` |
| EFC | `students.view`, `departments.view`, `reports.view`, `announcements.view` |

Granting a `*.create` permission implies the matching `*.view`. Any of `marks.create`, `marks.approve` or `marks.publish` implies `marks.view`.

## 5. Response conventions

The codebase has grown in stages, so response envelopes differ by module. Each endpoint's documentation shows its exact shape. The patterns are:

| Pattern | Shape | Used by |
|---|---|---|
| Single resource | `{ "data": { ... } }` | Most newer endpoints |
| Plain list | `{ "data": [ ... ] }` | Lists without paging |
| Resource paginator | `{ "data": [...], "links": {...}, "meta": {...} }` | Audit logs, invitations, registrations, mark entries, mark schemes, publishing logs, interview history |
| Raw paginator | `{ "current_page", "data", "per_page", "total", "last_page", "from", "to", "links", ... }` | Departments, designations |
| Bare JSON | An array or model with no envelope | Courses, subjects, semesters, announcements list, companies list, masters list, staff list |
| Campus dataset | `{ "data": CampusDataset }` | Writes to announcements, companies, masters, staff (V1) |
| Legacy envelope | `{ "success": true, "data": ..., "message": "..." }` | `/student/*` and `/staff/*` portal endpoints |
| No content | HTTP 204, empty body | Some deletes |

**Field casing.** Newer endpoints use `camelCase` in both requests and responses. Course, subject, semester, department, designation, attendance and the `/staff/*` and `/student/*` portal endpoints use `snake_case`. Each endpoint documents what it expects.

**Dates.** Timestamps are ISO 8601 with offset (`2026-10-28T09:15:00+00:00`). Calendar dates are `YYYY-MM-DD`.

### Resource paginator `meta` and `links`

```json
{
  "data": [],
  "links": { "first": "...?page=1", "last": "...?page=3", "prev": null, "next": "...?page=2" },
  "meta": {
    "current_page": 1, "from": 1, "last_page": 3, "path": "...", "per_page": 25, "to": 25, "total": 61,
    "links": [{ "url": null, "label": "&laquo; Previous", "active": false }]
  }
}
```

### Shared shapes

These are referenced by name throughout the module files.

#### `SessionUser`

Returned by login, `GET /auth/me`, `GET /campus/bootstrap` and inside `CampusDataset.users`.

```json
{
  "id": 7,
  "name": "Asha Raman",
  "email": "asha@college.edu",
  "role": "staff",
  "status": "active",
  "emailVerified": true,
  "institutionId": 1,
  "title": "Assistant Professor",
  "departmentCode": "CSE",
  "designationId": 3,
  "designationName": "Head of Department",
  "phone": "+91 98xxxxxx10",
  "imageUrl": "http://localhost:8000/storage/staff/7.jpg",
  "communicationAddress": null,
  "permanentAddress": null,
  "emergencyContactPerson": null,
  "emergencyContactNumber": null,
  "biometricId": null,
  "experienceYears": 6,
  "specialization": "Databases",
  "studentId": null,
  "permissions": ["dashboard.view", "marks.approve", "marks.create", "marks.view"]
}
```

`status` is one of `active`, `pending_approval`, `rejected`, `suspended`. `studentId` is set only for student accounts.

#### `CampusDataset`

The front end's initial dataset, filtered to what the caller may see.

```json
{
  "users": [SessionUser],
  "departments": [{ "id": 1, "name": "Computer Science", "code": "CSE", "hod": "Dr. Rao", "staffCount": 12, "intake": 120, "accent": "#2563eb" }],
  "designations": [{ "id": 3, "name": "Head of Department", "slug": "head-of-department", "description": "", "permissions": ["..."], "staffCount": 4 }],
  "masters": [{ "id": 1, "category": "student_year", "code": "year_1", "label": "1st Year", "description": "", "sortOrder": 1 }],
  "students": [Student],
  "companies": [Company],
  "announcements": [Announcement]
}
```

Visibility rules:

- `users` lists every user for admins, and only the caller otherwise.
- `designations` is empty for non-admins.
- `students` lists every student for admins and placement officers, only the own department for staff, and only themselves for a student.
- `companies` for a student only includes drives whose `eligibleDepartments` contains the student's department.
- `announcements` for non-admins is filtered by audience. Staff and placement officers see `all` and `staff`. Students see `all` and `students`. Recruiters see `all`.

#### `Student`

```json
{
  "id": 41,
  "name": "Rahul Menon",
  "email": "rahul@college.edu",
  "registrationNumber": "CSE2026041",
  "departmentCode": "CSE",
  "batchId": 2,
  "year": "year_3",
  "gender": "male",
  "status": "placement_ready",
  "cgpa": 8.42,
  "cgpaSource": "results",
  "activeBacklogs": 0,
  "attendance": 87,
  "phone": "",
  "mentor": "Dr. Rao",
  "feeStatus": "paid",
  "placedCompany": null,
  "appliedCompanyIds": [3, 5],
  "skills": ["Java", "React", "SQL"],
  "resume": { "template": "classic_ats", "headline": "..." }
}
```

`cgpa` comes from published results once any exist (`cgpaSource: "results"`); until then it is the hand-entered value (`cgpaSource: "manual"`).

#### `Company`

```json
{
  "id": 3, "name": "Infosys", "role": "Systems Engineer", "packageOffered": "4.5 LPA",
  "driveDate": "2026-11-12", "status": "open", "location": "Bengaluru", "type": "placement",
  "applicants": 54, "shortlisted": 12, "eligibleDepartments": ["CSE", "ECE"]
}
```

#### `Announcement`

```json
{
  "id": 9, "title": "Mid-semester exams", "summary": "Exams start on 5 Nov.", "audience": "students",
  "priority": "high", "postedBy": "Dr. Rao", "date": "2026-10-28", "category": "Exams"
}
```

### Master option codes

These codes are validated on input and returned on output.

| Category | Codes |
|---|---|
| `student_year` | `year_1`, `year_2`, `year_3`, `year_4` |
| `student_gender` | `male`, `female`, `non_binary`, `prefer_not_to_say` |
| `student_status` | `active`, `placement_ready`, `placed` |
| `payment_status` | `paid`, `pending` |
| `company_drive_status` | `upcoming`, `open`, `closing_soon`, `closed` |
| `company_drive_type` | `placement`, `internship` |
| `announcement_audience` | `all`, `students`, `staff`, `admin` |
| `announcement_priority` | `high`, `medium`, `low` |

Admins can add more options per category through `/masters`.

## 6. Errors

| Status | When | Body |
|---|---|---|
| 401 | Missing, expired or revoked token | `{ "message": "Unauthenticated." }` |
| 403 | Missing route permission | `{ "message": "User does not have the right permissions." }` |
| 403 | Policy or form-request denial | `{ "message": "You can only manage students in your own department." }` |
| 404 | Record missing, in another institution, or not yours | `{ "message": "No query results for model [App\\Models\\Student] 99" }` or a specific message |
| 409 | Record in the wrong state | `{ "message": "This interview is completed; answers are no longer accepted." }` |
| 422 | Validation failed | `{ "message": "The email field is required. (and 1 more error)", "errors": { "email": ["The email field is required."], "password": ["..."] } }` |
| 422 | Business rule broken | `{ "message": "...", ...extraKeys }`, for example `pendingSubjects` or `missingStudents` |
| 423 | Account locked after repeated wrong passwords | `{ "message": "Too many failed sign-in attempts. Try again in 15 minutes or reset your password." }` |
| 429 | Rate limit exceeded | `{ "message": "Too Many Attempts." }` plus `Retry-After` |
| 500 | Unhandled server error | `{ "message": "Server Error." }` (full trace only when `APP_DEBUG=true`) |

## 7. Rate limits

| Limiter | Limit | Key | Applies to |
|---|---|---|---|
| `api` | 120 / minute | User, or IP when signed out | Every authenticated route |
| `login` | 5 / minute and 120 / minute | Email + IP, and IP | `POST /auth/login` |
| `register` | 30 / minute | IP | `POST /auth/register` |
| `password-reset` | 3 / minute and 30 / minute | Email + IP, and IP | Forgot, reset, email verify link |
| `verification` | 3 / minute | User | Resend verification email |
| `invitation` | 30 / minute | IP | Invitation preview and accept |
| `uploads` | 10 / minute | User | Logo, photo, resume upload, bulk invitations |
| `ai` | `AI_RATE_LIMIT_PER_MINUTE`, default 5 / minute | User | Create, start and finish interviews; queue resume analysis |
| `ai-answers` | `AI_ANSWER_RATE_LIMIT_PER_MINUTE`, default 30 / minute | User | Interview answers |

## 8. Pagination parameters

Parameter names differ by endpoint. Each endpoint lists its own.

| Style | Parameters | Endpoints |
|---|---|---|
| snake_case | `page`, `per_page` | Students, departments, designations, invitations, registrations, audit logs, legacy attendance |
| camelCase | `page`, `perPage` | Mark entries, mark review queue, mark schemes, publishing logs, interview history |

## 9. Sample-data endpoints

43 endpoints under `/staff/*` and 11 under `/student/*` (assignments, materials and notifications) return **hardcoded sample data** and change nothing in the database. They send `X-Data-Source: sample`. They are marked "Sample data" in the index. Treat their shapes as provisional: they will change when the controllers are connected to real tables.

`/staff/placement/*` is the exception under `/staff`: it reads and writes real company records.

---

## 10. Endpoint index

**Legend.** ✓ allowed by the role's base permissions. **D** allowed only when the user's designation grants the permission (staff and placement officers). — denied. · not applicable (public or signed URL). The index reflects route permissions plus the role checks made inside controllers and form requests. Record-level rules such as "own department" are in the Notes column and the module files.

Total: 262 routes.

| Method | Path | Auth | Permission | SA | IA | PO | STF | STU | REC | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/announcements` | Bearer | `announcements.view` | ✓ | ✓ | ✓ | D | ✓ | — |  |
| POST | `/api/v1/announcements` | Bearer | `announcements.create` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/announcements/{announcement}` | Bearer | `announcements.create` | ✓ | ✓ | ✓ | D | — | — |  |
| DELETE | `/api/v1/announcements/{announcement}` | Bearer | `announcements.create` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/attendance` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| POST | `/api/v1/attendance/approve` | Bearer | `attendance.approve` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/attendance/mark` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/attendance/student/{studentId}/report` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/attendance/subject/{subjectId}/report` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/attendance/subject/{subjectId}/students` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/attendance/subjects` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — |  |
| PUT | `/api/v1/attendance/{attendanceId}` | Bearer | `attendance.edit` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/attendance/{attendanceId}` | Bearer | `attendance.delete` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/audit-logs` | Bearer | `activity.view` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/auth/email/verification-notification` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/auth/email/verify/{id}/{hash}` | Signed URL | — | · | · | · | · | · | · |  |
| POST | `/api/v1/auth/forgot-password` | Public | — | · | · | · | · | · | · |  |
| POST | `/api/v1/auth/login` | Public | — | · | · | · | · | · | · |  |
| POST | `/api/v1/auth/logout` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/auth/me` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| PUT | `/api/v1/auth/profile` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| POST | `/api/v1/auth/register` | Public | — | · | · | · | · | · | · |  |
| POST | `/api/v1/auth/reset-password` | Public | — | · | · | · | · | · | · |  |
| GET | `/api/v1/auth/sessions` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| DELETE | `/api/v1/auth/sessions` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| DELETE | `/api/v1/auth/sessions/{session}` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/batches` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/batches` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| PUT | `/api/v1/batches/{batch}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/batches/{batch}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/batches/{batch}/students` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/batches/{batch}/students` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/campus/bootstrap` | Bearer | `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| POST | `/api/v1/campus/reset` | Bearer | `demo.reset` | ✓ | ✓ | D | D | — | — | Only when DEMO_RESET_ENABLED=true. |
| GET | `/api/v1/campuses` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/campuses` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| PUT | `/api/v1/campuses/{campus}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/campuses/{campus}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/companies` | Bearer | `placement.view` | ✓ | ✓ | ✓ | D | ✓ | — |  |
| POST | `/api/v1/companies` | Bearer | `placement.create` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/companies/{company}` | Bearer | `placement.create` | ✓ | ✓ | ✓ | D | — | — |  |
| DELETE | `/api/v1/companies/{company}` | Bearer | `placement.create` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/companies/{company}/apply` | Bearer | `placement.apply` | ✓ | ✓ | D | D | ✓ | — | Needs a verified email and a linked student record. |
| GET | `/api/v1/courses` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/courses` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/courses/list/departments` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/courses/list/select` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/courses/list/staff` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/courses/{course}` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/courses/{course}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/courses/{course}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/departments` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/departments` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/departments/list/hod-options` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/departments/{department}` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/departments/{department}` | Bearer | `departments.edit` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/departments/{department}` | Bearer | `departments.delete` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/departments/{department}/stats` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/designations` | Bearer | `designations.view` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/designations` | Bearer | `designations.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/designations/list/departments` | Bearer | `designations.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/designations/list/global` | Bearer | `designations.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/designations/list/permissions` | Bearer | `permissions.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/designations/{department}/by-department` | Bearer | `designations.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/designations/{designation}` | Bearer | `designations.view` | ✓ | ✓ | D | D | — | — |  |
| PUT | `/api/v1/designations/{designation}` | Bearer | `designations.edit` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/designations/{designation}` | Bearer | `designations.delete` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/designations/{designation}/assign-permissions` | Bearer | `designations.edit` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/exams` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/files/resumes/{resume}` | Signed URL | — | · | · | · | · | · | · |  |
| GET | `/api/v1/files/student-photos/{student}` | Signed URL | — | · | · | · | · | · | · |  |
| GET | `/api/v1/grade-rules` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| POST | `/api/v1/grade-rules` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| POST | `/api/v1/grade-rules/setup-defaults` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Needs an institution (not Super Admin). |
| GET | `/api/v1/grade-rules/{gradeRule}` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| PUT | `/api/v1/grade-rules/{gradeRule}` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| DELETE | `/api/v1/grade-rules/{gradeRule}` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/institution` | Bearer | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Needs an institution (not Super Admin). |
| POST | `/api/v1/institution/logo` | Bearer | `settings.manage` | ✓ | ✓ | D | D | — | — | Needs an institution (not Super Admin). |
| PUT | `/api/v1/institution/settings` | Bearer | `settings.manage` | ✓ | ✓ | D | D | — | — | Needs an institution (not Super Admin). |
| GET | `/api/v1/interviews/{interview}` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/interviews/{interview}/answers` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/interviews/{interview}/evaluation` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/interviews/{interview}/finish` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/interviews/{interview}/report` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/interviews/{interview}/skill-gap` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/interviews/{interview}/start` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/interviews/{interview}/turns/{turn}/answer` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/invitations` | Bearer | `users.create` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/invitations` | Bearer | `users.create` | ✓ | ✓ | D | D | — | — | Needs an institution (not Super Admin). |
| GET | `/api/v1/invitations/accept/{token}` | Public | — | · | · | · | · | · | · |  |
| POST | `/api/v1/invitations/accept/{token}` | Public | — | · | · | · | · | · | · |  |
| DELETE | `/api/v1/invitations/{invitation}` | Bearer | `users.create` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/invitations/{invitation}/resend` | Bearer | `users.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/mark-entries` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/mark-entries/get-students` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Faculty must be allocated to the subject. |
| POST | `/api/v1/mark-entries/save-draft` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Faculty must be allocated to the subject. |
| POST | `/api/v1/mark-entries/submit` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Faculty must be allocated to the subject. |
| GET | `/api/v1/mark-entries/{markEntry}` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| POST | `/api/v1/mark-review/bulk-approve` | Bearer | `marks.approve` | ✓ | ✓ | D | D | — | — | HOD: own department. `marks.publish` holders: all. |
| GET | `/api/v1/mark-review/exam-summary` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/mark-review/get-submitted-marks` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| POST | `/api/v1/mark-review/{markEntry}/approve` | Bearer | `marks.approve` | ✓ | ✓ | D | D | — | — | HOD: own department. `marks.publish` holders: all. |
| POST | `/api/v1/mark-review/{markEntry}/reject` | Bearer | `marks.approve` | ✓ | ✓ | D | D | — | — | HOD: own department. `marks.publish` holders: all. |
| POST | `/api/v1/mark-review/{markEntry}/verify` | Bearer | `marks.approve` | ✓ | ✓ | D | D | — | — | HOD: own department. `marks.publish` holders: all. |
| GET | `/api/v1/mark-schemes` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| POST | `/api/v1/mark-schemes` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/mark-schemes/{markScheme}` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| PUT | `/api/v1/mark-schemes/{markScheme}` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| DELETE | `/api/v1/mark-schemes/{markScheme}` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — |  |
| GET | `/api/v1/masters` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| POST | `/api/v1/masters` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| PUT | `/api/v1/masters/{master}` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| DELETE | `/api/v1/masters/{master}` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| GET | `/api/v1/permissions/all` | Bearer | `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/permissions/modules` | Bearer | `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/permissions/roles/all` | Bearer | `roles.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/permissions/roles/{role}` | Bearer | `roles.view` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/permissions/{permission}/check` | Bearer | `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/placement-policy` | Bearer | `placement.view` | ✓ | ✓ | ✓ | D | ✓ | — |  |
| PUT | `/api/v1/placement-policy` | Bearer | `placement.manage` | ✓ | ✓ | ✓ | D | — | — | Needs an institution (not Super Admin). |
| GET | `/api/v1/registrations` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/registrations/{registration}/approve` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — |  |
| POST | `/api/v1/registrations/{registration}/reject` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/reports/summary` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/result-publishing/logs` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| POST | `/api/v1/result-publishing/publish` | Bearer | `marks.publish` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/result-publishing/status` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | — | — |  |
| POST | `/api/v1/result-publishing/unlock` | Bearer | `marks.publish` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/semesters` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/semesters` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/semesters/list/academic-years` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/semesters/list/options` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/semesters/{semester}` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/semesters/{semester}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/semesters/{semester}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/skills` | Bearer | `profile.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| GET | `/api/v1/staff` | Bearer | `departments.view` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| POST | `/api/v1/staff` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| GET | `/api/v1/staff/attendance/classes` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/attendance/history` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — | Sample data. |
| GET | `/api/v1/staff/attendance/students` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/attendance/subjects` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| POST | `/api/v1/staff/attendance/submit` | Bearer | `attendance.mark` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/department/announcements` | Bearer | `announcements.view` | ✓ | ✓ | ✓ | D | ✓ | — | Sample data. |
| GET | `/api/v1/staff/department/budget` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/department/classes` | Bearer | `classes.view` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/department/infrastructure` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/department/overview` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/department/performance` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/department/staff` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/exam` | Bearer | `exams.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/exam` | Bearer | `exams.create` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/exam/report` | Bearer | `exams.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/exam/seating-arrangement` | Bearer | `exams.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/exam/{examId}` | Bearer | `exams.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/exam/{examId}/assign-classrooms` | Bearer | `exams.edit` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/exam/{examId}/assign-invigilators` | Bearer | `exams.edit` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/exam/{examId}/declare-results` | Bearer | `exams.edit` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/exam/{examId}/progress` | Bearer | `exams.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/management` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/management` | Bearer | `staff.create` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/management/list/departments` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/management/list/designations` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/management/{staffId}` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| PUT | `/api/v1/staff/management/{staffId}` | Bearer | `staff.edit` | ✓ | ✓ | D | D | — | — | Sample data. |
| DELETE | `/api/v1/staff/management/{staffId}` | Bearer | `staff.delete` | ✓ | ✓ | D | D | — | — | Sample data. |
| POST | `/api/v1/staff/management/{staffId}/assign-classes` | Bearer | `staff.edit` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/management/{staffId}/workload` | Bearer | `staff.view` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/marks/exams` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — | Sample data. |
| GET | `/api/v1/staff/marks/statistics` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — | Sample data. |
| GET | `/api/v1/staff/marks/students` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| POST | `/api/v1/staff/marks/submit` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/marks/template` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| POST | `/api/v1/staff/marks/upload` | Bearer | `marks.create` | ✓ | ✓ | D | ✓ | — | — | Sample data. |
| GET | `/api/v1/staff/placement/applications` | Bearer | `placement.manage` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/staff/placement/drives` | Bearer | `placement.view` | ✓ | ✓ | ✓ | D | ✓ | — |  |
| POST | `/api/v1/staff/placement/drives` | Bearer | `placement.create` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/staff/placement/drives/{driveId}` | Bearer | `placement.manage` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/staff/placement/report` | Bearer | `placement.manage` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/staff/placement/results-by-batch` | Bearer | `placement.view_results` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/staff/placement/statistics` | Bearer | `placement.view` | ✓ | ✓ | ✓ | D | ✓ | — |  |
| GET | `/api/v1/staff/reports/academic-performance` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/reports/attendance` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| POST | `/api/v1/staff/reports/generate` | Bearer | `reports.generate` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/staff/reports/placement` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/reports/research` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| GET | `/api/v1/staff/reports/resource-utilization` | Bearer | `reports.view` | ✓ | ✓ | ✓ | D | — | — | Sample data. |
| PUT | `/api/v1/staff/{staff}` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| DELETE | `/api/v1/staff/{staff}` | Bearer | `departments.create` | ✓ | ✓ | — | — | — | — | Admins only (checked in controller). |
| GET | `/api/v1/student/assignments` | Bearer | `assignments.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| POST | `/api/v1/student/assignments/submit` | Bearer | `assignments.submit` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| GET | `/api/v1/student/attendance` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/attendance/detailed` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/attendance/statistics` | Bearer | `attendance.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/marks` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/marks/statistics` | Bearer | `marks.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/materials` | Bearer | `materials.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| GET | `/api/v1/student/notifications` | Bearer | `notifications.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| DELETE | `/api/v1/student/notifications/delete` | Bearer | `notifications.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| DELETE | `/api/v1/student/notifications/delete-all` | Bearer | `notifications.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| POST | `/api/v1/student/notifications/mark-all-as-read` | Bearer | `notifications.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| POST | `/api/v1/student/notifications/mark-as-read` | Bearer | `notifications.view` | ✓ | ✓ | D | D | ✓ | — | Sample data. |
| GET | `/api/v1/student/notifications/preferences` | Bearer | `notifications.manage` | ✓ | ✓ | D | D | — | — | Sample data. |
| PUT | `/api/v1/student/notifications/preferences` | Bearer | `notifications.manage` | ✓ | ✓ | D | D | — | — | Sample data. |
| GET | `/api/v1/student/results/all` | Bearer | `marks.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/student/results/semester/{semester}` | Bearer | `marks.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/student/results/semesters` | Bearer | `marks.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/student/timetable` | Bearer | `timetable.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/student/timetable/day` | Bearer | `timetable.view` | ✓ | ✓ | D | ✓ | ✓ | — |  |
| GET | `/api/v1/students` | Bearer | `students.view` | ✓ | ✓ | ✓ | ✓ | — | — |  |
| POST | `/api/v1/students` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/students/me/academics` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/certifications` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/certifications` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/certifications/{certification}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/certifications/{certification}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/education` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/education/{education}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/education/{education}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/experience` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/experience` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/experience/{experience}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/experience/{experience}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/interviews` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/interviews` | Bearer | `interviews.practice` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/profile` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/profile` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/profile/photo` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/projects` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/projects` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/projects/{project}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/projects/{project}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/readiness` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/readiness-score` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/readiness/history` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/recommendations` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| PATCH | `/api/v1/students/me/recommendations/{recommendation}` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/resume` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/resumes` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/resumes` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/resumes/{resume}` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/resumes/{resume}` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/resumes/{resume}/analysis` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| POST | `/api/v1/students/me/resumes/{resume}/analysis` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/resumes/{resume}/download` | Bearer | `resumes.manage` | — | — | — | — | ✓ | — |  |
| GET | `/api/v1/students/me/skills` | Bearer | `profile.view` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/me/skills` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| DELETE | `/api/v1/students/me/skills/{skill}` | Bearer | `profile.edit` | — | — | — | — | ✓ | — |  |
| PUT | `/api/v1/students/{student}` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — | Staff: own department only. |
| DELETE | `/api/v1/students/{student}` | Bearer | `students.create` | ✓ | ✓ | D | D | — | — | Staff: own department only. |
| GET | `/api/v1/students/{student}/academic-summary` | Bearer | `results.view_summary` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/students/{student}/academics` | Bearer | `students.view` | — | — | — | — | — | — | Staff: own department only. |
| POST | `/api/v1/students/{student}/academics/recalculate` | Bearer | `students.edit` | ✓ | ✓ | D | D | — | — | Staff: own department only. |
| POST | `/api/v1/students/{student}/education/{education}/verify` | Bearer | `students.edit` | ✓ | ✓ | D | D | — | — | Staff: own department only. |
| GET | `/api/v1/students/{student}/profile` | Bearer | `students.view` | — | — | — | — | — | — | Staff: own department only. |
| GET | `/api/v1/subjects` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| POST | `/api/v1/subjects` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| GET | `/api/v1/subjects/list/courses` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| GET | `/api/v1/subjects/{subject}` | Bearer | `departments.view` | ✓ | ✓ | ✓ | D | — | — |  |
| PUT | `/api/v1/subjects/{subject}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
| DELETE | `/api/v1/subjects/{subject}` | Bearer | `departments.create` | ✓ | ✓ | D | D | — | — |  |
