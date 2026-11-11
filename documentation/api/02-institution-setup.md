# Institution setup and administration

Paths are relative to `/api/v1`. Every endpoint here needs `Authorization: Bearer <token>` and `Accept: application/json`. Shared shapes are defined in [README.md](README.md#shared-shapes).

Who can call what is decided by the route permission. Admins (Super Admin, Institution Admin) hold every permission. Staff and placement officers get the `departments.*`, `designations.*` and similar permissions only through a designation.

---

## Campus dataset

### GET /campus/bootstrap

**Permission:** `dashboard.view` (every role).

Returns the signed-in user and their filtered campus dataset. The front end calls it after a page reload.

**200 OK**

```json
{ "user": SessionUser, "data": CampusDataset }
```

### POST /campus/reset

**Permission:** `demo.reset` (admins). Only works when `DEMO_RESET_ENABLED=true`.

Re-runs the demo seeder, replacing demo data, then returns the fresh dataset.

**200 OK:** `{ "user": SessionUser, "data": CampusDataset }`

**403:** `Demo reset is disabled in this environment.`

### GET /reports/summary

**Permission:** `reports.view` (admins, placement officers, designations).

Headline counts computed from the caller's visible dataset.

**200 OK**

```json
{
  "students": 420,
  "placed": 96,
  "placementReady": 140,
  "openDrives": 4,
  "departments": 6,
  "announcements": 12,
  "placementRate": 23
}
```

`placementRate` is a whole-number percentage. `openDrives` counts drives with status `open` or `closing_soon`.

---

## Institution settings

The institution is always the caller's own. There is no id in the path. Super Admin has no institution, so these calls answer 404 or 403 for that role.

### GET /institution

**Permission:** none beyond sign-in. Every member of the institution can read the branding.

**200 OK**

```json
{
  "data": {
    "id": 1,
    "name": "ABC College of Engineering",
    "code": "ABC-ENGG",
    "logoUrl": "http://localhost:8000/storage/institution-logos/1/logo.png",
    "primaryColor": "#1D4ED8",
    "accentColor": "#F59E0B",
    "contactEmail": "office@abc.edu",
    "contactPhone": "+91 80 1234 5678",
    "website": "https://abc.edu",
    "address": "1 College Road, Bengaluru",
    "emailSenderName": "ABC Placements",
    "emailReplyTo": "placements@abc.edu"
  }
}
```

### PUT /institution/settings

**Permission:** `settings.manage` (admins).

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `contactEmail` | string | nullable, email |
| `contactPhone` | string | nullable, max 30 |
| `website` | string | nullable, http or https URL |
| `address` | string | nullable, max 500 |
| `primaryColor` | string | nullable, hex `#RRGGBB` |
| `accentColor` | string | nullable, hex `#RRGGBB` |
| `emailSenderName` | string | nullable, max 100 |
| `emailReplyTo` | string | nullable, email |

**200 OK:** the institution, same shape as `GET /institution`.

**422** example: `errors.primaryColor` = `Use a hex colour such as #1D4ED8.`

### POST /institution/logo

**Permission:** `settings.manage`. **Rate limit:** `uploads`.

**Headers:** `Content-Type: multipart/form-data`

| Field | Type | Rules |
|---|---|---|
| `logo` | file | required, PNG, JPG, JPEG or WEBP, max 1 MB, max 2000×2000 px. SVG is refused. |

**200 OK:** the institution with the new `logoUrl`. The previous logo file is deleted.

---

## Campuses (physical sites)

**Permissions:** read `departments.view`, write `departments.create`.

`Campus` shape:

```json
{ "id": 1, "name": "Main Campus", "code": "MAIN", "address": "1 College Road", "city": "Bengaluru", "state": "Karnataka", "phone": "+91 80 1234 5678", "isPrimary": true }
```

### GET /campuses

**200 OK:** `{ "data": [Campus] }`, primary campus first, then by name.

### POST /campuses

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `code` | string | required, max 30, `A-Z 0-9 _ -` (upper-cased for you), unique in the institution |
| `address` | string | nullable, max 500 |
| `city` | string | nullable, max 100 |
| `state` | string | nullable, max 100 |
| `phone` | string | nullable, max 30 |
| `isPrimary` | boolean | optional. The first campus is always primary. |

**201 Created:** `{ "data": Campus }`

### PUT /campuses/{campus}

Same body. Sending `isPrimary: true` makes this the only primary campus.

**200 OK:** `{ "data": Campus }`

**422:** `Make another campus primary instead of unsetting this one.`

### DELETE /campuses/{campus}

**200 OK:** `{ "message": "Campus deleted." }`

**409:** `Make another campus primary before deleting this one.`

---

## Batches (admission cohorts)

**Permissions:** read `departments.view`, write `departments.create`.

`Batch` shape:

```json
{
  "id": 2, "name": "B.Tech CSE 2023-27", "code": "CSE-2023", "departmentCode": "CSE",
  "courseId": 1, "courseName": "B.Tech Computer Science", "admissionYear": 2023,
  "graduationYear": 2027, "status": "active", "studentCount": 118
}
```

### GET /batches

| Query | Rules |
|---|---|
| `status` | optional, `active`, `graduated` or `archived` |
| `departmentCode` | optional |

**200 OK:** `{ "data": [Batch] }`, newest admission year first.

### POST /batches

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `code` | string | required, max 50, `A-Z 0-9 _ -`, unique in the institution |
| `departmentCode` | string | nullable, existing department |
| `courseId` | integer | nullable, existing course |
| `admissionYear` | integer | required, 2000–2100 |
| `graduationYear` | integer | required, ≥ `admissionYear` and ≤ `admissionYear` + 8 |
| `status` | string | optional, `active` (default), `graduated`, `archived` |

**201 Created:** `{ "data": Batch }`

### PUT /batches/{batch}

Same body. `status` is left unchanged when not sent.

**200 OK:** `{ "data": Batch }`

### DELETE /batches/{batch}

**200 OK:** `{ "message": "Batch deleted." }`

**409:** `Move the students to another batch before deleting this one.`

### POST /batches/{batch}/students

Moves students into the batch.

| Field | Type | Rules |
|---|---|---|
| `studentIds` | integer[] | required, 1–500 distinct ids of students in the institution |

```json
{ "studentIds": [41, 42, 43] }
```

**200 OK**

```json
{ "message": "3 student(s) added to CSE-2023.", "data": Batch }
```

**422** when the batch has a department and some students belong to another one. The body lists them:

```json
{ "message": "These students are not in CSE: Priya N.", "studentIds": [43] }
```

### DELETE /batches/{batch}/students

Same body. Removes only students currently in this batch.

**200 OK:** `{ "message": "2 student(s) removed from CSE-2023.", "data": Batch }`

---

## Departments

**Permissions:** read `departments.view`, create `departments.create`, update `departments.edit`, delete `departments.delete`.

Responses return the database model in **snake_case**:

```json
{
  "id": 1, "name": "Computer Science", "code": "CSE", "description": "...", "hod_id": 7,
  "contact_email": "cse@abc.edu", "phone": "080-1234", "intake_capacity": 120, "status": "active",
  "staff_count": 12,
  "hod": { "id": 7, "first_name": "Asha", "last_name": "Raman", "email": "asha@abc.edu" },
  "created_at": "...", "updated_at": "..."
}
```

### GET /departments

| Query | Rules |
|---|---|
| `status` | optional, `active` or `inactive` |
| `search` | optional, matches name or code |
| `per_page` | optional, default 50 |
| `page` | optional |

**200 OK:** a raw Laravel paginator (`current_page`, `data`, `per_page`, `total`, `last_page`, …). Each item includes `staff_count`.

### GET /departments/{department}

**200 OK:** `{ "data": Department }` with `staff_count`, `student_count` and `courses_count`.

### POST /departments

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `code` | string | required, max 50, unique |
| `description` | string | nullable, max 1000 |
| `hod_id` | integer | nullable, existing user id |
| `contact_email` | string | nullable, email |
| `phone` | string | nullable, max 20 |
| `intake_capacity` | integer | nullable, ≥ 0 |
| `status` | string | nullable, `active` or `inactive` |

**201 Created**

```json
{ "message": "Department created successfully", "data": Department }
```

### PUT /departments/{department}

Same fields, all optional (`sometimes`).

**200 OK:** `{ "message": "Department updated successfully", "data": Department }`

### DELETE /departments/{department}

**200 OK:** `{ "message": "Department deleted successfully" }`

### GET /departments/list/hod-options

Staff users who can be picked as head of department.

**200 OK**

```json
{ "data": [{ "id": 7, "name": "Asha Raman", "email": "asha@abc.edu", "department": "CSE" }] }
```

### GET /departments/{department}/stats

**200 OK**

```json
{
  "data": {
    "id": 1, "name": "Computer Science", "code": "CSE", "hod_name": "Asha Raman",
    "staff_count": 12, "total_faculty": 12, "student_count": 420, "total_students": 420,
    "average_cgpa": 7.84, "placement_rate": 22.9, "courses_count": 2,
    "intake_capacity": 120, "status": "active"
  }
}
```

---

## Courses

**Permissions:** read `departments.view`, write `departments.create`.

Responses are the bare model in **snake_case**, with `department` loaded. No `data` envelope.

### GET /courses

| Query | Rules |
|---|---|
| `department_id` | optional |
| `search` | optional, matches name or code |

**200 OK:** `[Course]`

### GET /courses/{course}

**200 OK:** `Course` with `department` and `subjects`.

### POST /courses

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `code` | string | required, max 50, unique in the institution |
| `department_id` | integer | required, existing department |
| `course_type` | string | nullable, `UG`, `PG`, `Diploma`, `Certification` |
| `stream` | string | nullable, `Science`, `Commerce`, `Arts`, `Engineering`, `Management`, `Other` |
| `mode` | string | nullable, `Full-Time`, `Part-Time`, `Distance`, `Hybrid` |
| `academic_level` | string | nullable, `Undergraduate`, `Postgraduate`, `Diploma`, `Certificate` |
| `duration_value` | integer | nullable, 1–10 |
| `duration_type` | string | nullable, `Years`, `Months`, `Weeks` |
| `total_semesters` | integer | required, 1–16 |
| `total_credits` | integer | nullable, ≥ 1 |
| `description` | string | nullable |
| `intake_capacity` | integer | nullable, ≥ 1 |
| `eligibility` | string | nullable |
| `min_qualification` | string | nullable, max 255 |
| `entrance_required` | boolean | optional |
| `course_coordinator_id` | integer | nullable, existing user |
| `total_fees` | number | nullable, ≥ 0 |
| `fees_per_semester` | number | nullable, ≥ 0 |
| `is_active` | boolean | optional |

**201 Created:** `Course`

### PUT /courses/{course}

Same body, same rules (`name`, `code`, `department_id` and `total_semesters` stay required).

**200 OK:** `Course`

### DELETE /courses/{course}

**200 OK:** `{ "message": "Course deleted successfully" }`

### Dropdown helpers

| Endpoint | 200 OK body |
|---|---|
| `GET /courses/list/departments` | `[{ "id", "name", "code" }]` |
| `GET /courses/list/select` | Active courses: `[{ "id", "name", "code", "duration_value", "duration_type", "total_semesters" }]` |
| `GET /courses/list/staff` | `[{ "id", "name", "email" }]` for staff users |

---

## Subjects

**Permissions:** read `departments.view`, write `departments.create`.

Bare model in **snake_case** with `course.department` loaded.

### GET /subjects

| Query | Rules |
|---|---|
| `course_id` | optional |
| `search` | optional |

**200 OK:** `[Subject]`

### GET /subjects/{subject}

**200 OK:** `Subject`

### POST /subjects

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `code` | string | required, max 50, unique in the institution |
| `course_id` | integer | required, existing course |
| `semester_number` | integer | required, 1–16 |
| `credit_hours` | integer | required, 1–10 |
| `lecture_hours` | integer | required, 0–50 |
| `practical_hours` | integer | required, 0–50 |
| `subject_type` | string | nullable, max 50 |
| `description` | string | nullable |
| `is_mandatory` | boolean | optional |
| `is_active` | boolean | optional |

**201 Created:** `Subject`

### PUT /subjects/{subject}

Same body. **200 OK:** `Subject`

### DELETE /subjects/{subject}

**200 OK:** `{ "message": "Subject deleted successfully" }`

### GET /subjects/list/courses

**200 OK:** `[{ "id", "name", "code", "duration_years", "total_semesters" }]` for active courses. See [08-known-issues.md](08-known-issues.md) about `duration_years`.

---

## Semesters and academic years

**Permissions:** read `departments.view`, write `departments.create`.

Bare model in **snake_case** with `academic_year` loaded.

```json
{
  "id": 5, "academic_year_id": 2, "name": "Semester 5", "semester_number": 5,
  "start_date": "2026-07-01", "end_date": "2026-11-30", "is_active": true,
  "academic_year": { "id": 2, "year": "2026-27", "code": "AY2026", "start_date": "...", "end_date": "...", "is_active": true }
}
```

### GET /semesters

| Query | Rules |
|---|---|
| `academic_year_id` | optional |
| `search` | optional |

**200 OK:** `[Semester]`, ordered by `semester_number`.

### GET /semesters/{semester}

**200 OK:** `Semester`

### POST /semesters

| Field | Type | Rules |
|---|---|---|
| `academic_year_id` | integer | required, existing academic year |
| `name` | string | required, max 255 |
| `semester_number` | integer | required, 1–16 |
| `start_date` | date | required |
| `end_date` | date | required, after `start_date` |
| `is_active` | boolean | optional |

**201 Created:** `Semester`

### PUT /semesters/{semester}

Same body. **200 OK:** `Semester`

### DELETE /semesters/{semester}

**200 OK:** `{ "message": "Semester deleted successfully" }`

### GET /semesters/list/academic-years

**200 OK**

```json
[{ "id": 2, "year": "2026-27", "name": "2026-27", "code": "AY2026", "start_date": "2026-06-01", "end_date": "2027-05-31", "start_year": 2026, "end_year": 2027, "is_active": true }]
```

### GET /semesters/list/options

**200 OK:** `[{ "value": 1, "label": "Semester 1" }, …, { "value": 16, "label": "Semester 16" }]`

There is no endpoint to create academic years yet.

---

## Designations

**Permissions:** read `designations.view`, create `designations.create`, update and assign `designations.edit`, delete `designations.delete`. `GET /designations/list/permissions` needs `permissions.view`. In practice these are admin-only.

`Designation` shape (snake_case):

```json
{
  "id": 3,
  "name": "Head of Department",
  "slug": "head-of-department",
  "department_id": 1,
  "description": "Department leadership...",
  "status": "active",
  "permissions": ["dashboard.view", "profile.view", "marks.approve", "marks.create", "marks.view"],
  "module_access": [{ "module_name": "marks", "permissions": ["create", "view"] }],
  "department": { "id": 1, "name": "Computer Science" },
  "users": null,
  "created_at": "...",
  "updated_at": "..."
}
```

`users` is filled only on `GET /designations/{designation}`, as `[{ "id", "first_name", "last_name", "email" }]`. `module_access` only shows the `view`, `create`, `edit` and `delete` actions.

### GET /designations

| Query | Rules |
|---|---|
| `status` | optional |
| `department_id` | optional. Returns that department's and global designations. |
| `search` | optional, name or description |
| `per_page` | optional, default 50 |

**200 OK:** raw paginator with `Designation` items.

### GET /designations/{designation}

**200 OK:** `{ "data": Designation }`

### POST /designations

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255, unique |
| `slug` | string | nullable, unique. Generated from `name` when missing. |
| `department_id` | integer | nullable, existing department. `null` means a global designation. |
| `description` | string | nullable, max 1000 |
| `status` | string | nullable, `active` or `inactive` |
| `permissions` | string[] | nullable, existing permission names |
| `module_access` | object[] | nullable. Used instead of `permissions` when sent. |
| `module_access.*.module_name` | string | required, max 100, e.g. `marks` |
| `module_access.*.permissions` | string[] | required, each `view`, `create`, `edit` or `delete` |

Send either form:

```json
{ "name": "Exam Cell", "department_id": null, "permissions": ["marks.view", "marks.approve", "marks.publish"] }
```

```json
{ "name": "Exam Cell", "module_access": [{ "module_name": "marks", "permissions": ["view", "create"] }] }
```

Permissions are normalised: `dashboard.view` and `profile.view` are always added, `*.create` implies `*.view`, and unknown names are dropped.

**201 Created:** `{ "message": "Designation created successfully", "data": Designation }`

### PUT /designations/{designation}

Same fields, all optional. When `module_access` is sent it wins over `permissions`. The slug is regenerated from `slug` or `name` when either is sent.

**200 OK:** `{ "message": "Designation updated successfully", "data": Designation }`

### DELETE /designations/{designation}

**200 OK:** `{ "message": "Designation deleted successfully" }`

### POST /designations/{designation}/assign-permissions

Replaces the designation's permissions.

| Field | Type | Rules |
|---|---|---|
| `permissions` | string[] | existing permission names |
| `permission_ids` | integer[] | existing permission ids |

One of the two is required.

**200 OK:** `{ "message": "Permissions assigned successfully", "data": Designation }`

**422:** `{ "message": "permissions or permission_ids is required" }`

### Lookup helpers

| Endpoint | 200 OK body |
|---|---|
| `GET /designations/list/departments` | `{ "data": [{ "id", "name" }] }` for active departments |
| `GET /designations/list/global` | `{ "data": [Designation] }` active designations with no department |
| `GET /designations/{department}/by-department` | `{ "data": [Designation] }` for that department plus global ones. The path segment is a **department** id. |
| `GET /designations/list/permissions` | `{ "data": [{ "id", "name" }] }` |
| `GET /designations/list/permissions?module=marks` | Only `marks.*` permissions |
| `GET /designations/list/permissions?group_by_module=1` | `{ "data": [{ "module_name": "marks", "actions": ["view", "create"], "permissions": [{ "id", "name" }] }] }` |

---

## Master options

Dropdown values (student year, gender, drive status, …). **Permission:** `departments.create`, and the controller also requires an **admin**. Others get 403 `Only admins can manage campus masters.`

### GET /masters

**200 OK:** the bare array `CampusDataset.masters`.

```json
[{ "id": 1, "category": "student_year", "code": "year_1", "label": "1st Year", "description": "", "sortOrder": 1 }]
```

### POST /masters

| Field | Type | Rules |
|---|---|---|
| `category` | string | required, one of the categories in [README.md](README.md#master-option-codes) |
| `label` | string | required, max 120. The `code` is generated from it (`Final Year` becomes `final_year`). |
| `description` | string | nullable, max 255 |
| `sortOrder` | integer | nullable, 1–999, default 1 |

**201 Created:** `{ "data": CampusDataset }`

**422:** `A master option with this label already exists in the selected category.`

### PUT /masters/{master}

| Field | Type | Rules |
|---|---|---|
| `label` | string | required, max 120. The `code` does not change. |
| `description` | string | nullable |
| `sortOrder` | integer | nullable |

**200 OK:** `{ "data": CampusDataset }`

### DELETE /masters/{master}

**200 OK:** `{ "data": CampusDataset }`

**422:** `This master option is still used by campus records. Update those records before deleting it.`

---

## Permissions introspection

| Endpoint | Permission | 200 OK body |
|---|---|---|
| `GET /permissions/modules` | `dashboard.view` | `{ "modules": ["students", "marks", ...], "role": "staff", "role_label": "Staff" }` |
| `GET /permissions/all` | `dashboard.view` | `{ "permissions": { "marks": { "view": true, "create": true, "edit": false, ... }, ... }, "role": "staff" }` |
| `GET /permissions/{permission}/check` | `dashboard.view` | `{ "permission": "marks.approve", "has_permission": false }` |
| `GET /permissions/roles/all` | `roles.view` | `{ "roles": [{ "id": 1, "name": "staff", "permissions_count": 11, "permissions": ["..."] }] }` |
| `GET /permissions/roles/{role}` | `roles.view` | `{ "id": 1, "name": "staff", "permissions": [{ "id", "name" }] }` |

Admins see every module and every action as `true`.

---

## Audit log

### GET /audit-logs

**Permission:** `activity.view` (admins). Scoped to the caller's institution.

| Query | Rules |
|---|---|
| `action` | optional. Exact action (`auth.login`) or a prefix ending in a dot (`invitation.`). |
| `actorId` | optional, integer |
| `from` | optional, date |
| `to` | optional, date, ≥ `from` |
| `per_page` | optional, 1–100, default 50 |
| `page` | optional |

**200 OK:** resource paginator.

```json
{
  "data": [{
    "id": 310,
    "action": "student.updated",
    "actorId": 2,
    "actorName": "Institution Admin",
    "subjectType": "Student",
    "subjectId": 41,
    "oldValues": { "cgpa": "8.10" },
    "newValues": { "cgpa": "8.42" },
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": "2026-10-28T09:20:11+00:00"
  }],
  "links": {}, "meta": {}
}
```

Recorded actions include `auth.login`, `auth.login_failed`, `auth.locked`, `auth.logout`, `auth.password_changed`, `auth.password_reset`, `auth.email_changed`, `auth.email_verified`, `auth.session_revoked`, `auth.sessions_revoked`, `registration.submitted`, `registration.approved`, `registration.rejected`, `invitation.created`, `invitation.resent`, `invitation.revoked`, `invitation.accepted`, `student.created`, `student.updated`, `student.deleted`, `staff.created`, `staff.updated`, `staff.deleted`, `batch.*`, `campus.*`, `institution.settings_updated`, `institution.logo_updated`, `placement.policy_updated`, `placement.drive_created`, `placement.drive_updated`, `results.published`, `results.unlocked` and `demo.reset`.

---

## Announcements

**Permissions:** read `announcements.view` (every role except recruiter), write `announcements.create` (admins, placement officers, designations).

### GET /announcements

**200 OK:** the bare array `CampusDataset.announcements`, filtered by audience for non-admins.

### POST /announcements

| Field | Type | Rules |
|---|---|---|
| `title` | string | required, max 255 |
| `summary` | string | required, max 1000 |
| `audience` | string | required. Admins: `all`, `students`, `staff`, `admin`. Others: `all`, `students`, `staff`. |
| `priority` | string | required, `high`, `medium`, `low` |
| `category` | string | required, max 100 |

```json
{ "title": "Mid-semester exams", "summary": "Exams start on 5 Nov.", "audience": "students", "priority": "high", "category": "Exams" }
```

`postedBy` is set to the caller's name and `date` to today.

**201 Created:** `{ "data": CampusDataset }`

### PUT /announcements/{announcement}

Same body. **200 OK:** `{ "data": CampusDataset }`

### DELETE /announcements/{announcement}

**200 OK:** `{ "data": CampusDataset }`
