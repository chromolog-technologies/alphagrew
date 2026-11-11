# People: students, staff, invitations, registrations

Paths are relative to `/api/v1`. Every endpoint needs `Authorization: Bearer <token>` and `Accept: application/json`. Shared shapes (`Student`, `SessionUser`, `CampusDataset`) are in [README.md](README.md#shared-shapes).

---

## Students (staff and admin side)

The student's own self-service endpoints are in [06-student-portal.md](06-student-portal.md).

**Who sees which students**

| Caller | Visible students |
|---|---|
| Super Admin | Every institution |
| Institution Admin, Placement Officer | The whole institution |
| Staff | Their own department only (`users.department_code`) |
| Student | Only themselves |

### GET /students

**Permission:** `students.view` (admins, placement officers, staff).

| Query | Rules |
|---|---|
| `page` | optional, ≥ 1 |
| `per_page` | optional, 1–100, default 25 |

**200 OK**

```json
{
  "data": [Student],
  "meta": { "currentPage": 1, "perPage": 25, "total": 420, "lastPage": 17 }
}
```

### POST /students

**Permission:** `students.create` (admins, plus HOD and Department Coordinator designations).

Creates the student record and its login account (role `student`, status `active`).

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `email` | string | required, email, unique among students in the institution and among all users |
| `password` | string | required, min 6 |
| `departmentCode` | string | nullable, existing department. **Required for admins.** Ignored for staff, who always create in their own department. |
| `year` | string | required, `year_1` … `year_4` |
| `gender` | string | required, `male`, `female`, `non_binary`, `prefer_not_to_say` |
| `status` | string | nullable, `active`, `placement_ready`, `placed` |
| `cgpa` | number | required, 0–10 (the manual value, used until results are published) |
| `attendance` | integer | required, 0–100 |
| `phone` | string | nullable, max 50 |
| `feeStatus` | string | required, `paid` or `pending` |
| `skills` | string[] | nullable, each max 100. Unknown names are added to the institution's skill catalogue, flagged for review. |

```json
{
  "name": "Rahul Menon", "email": "rahul@college.edu", "password": "temp1234",
  "departmentCode": "CSE", "year": "year_3", "gender": "male", "status": "active",
  "cgpa": 8.1, "attendance": 88, "phone": "+91 98xxxxxx21", "feeStatus": "paid",
  "skills": ["Java", "SQL"]
}
```

The mentor is set to the creating staff member, or to the department's HOD when an admin creates the student.

**201 Created**

```json
{ "student": Student, "user": SessionUser }
```

`user` is the student's login account and is returned **only to admins**. For other callers it is `null`.

**422:** `A department is required for new students.` when an admin leaves out `departmentCode`.

### PUT /students/{student}

**Permission:** `students.create`. Staff may only update students in their own department (403 `You can only manage students in your own department.`).

Same body as create, except `password` is optional (`nullable`, min 6). Leave it out to keep the current password.

**200 OK:** `{ "student": Student, "user": SessionUser | null }`

### DELETE /students/{student}

**Permission:** `students.create`, same department rule.

**204 No Content**

### GET /students/{student}/profile

Staff view of a student's career profile. See [06-student-portal.md](06-student-portal.md#get-studentsmeprofile) for the `StudentProfile` shape.

**Permission:** `students.view`, same department rule. **200 OK:** `{ "data": StudentProfile }`

The academic endpoints for one student (`/students/{student}/academics`, `/academic-summary`, `/academics/recalculate`, `/education/{education}/verify`) are in [04-academics-and-results.md](04-academics-and-results.md#student-academics-staff-side).

---

## Staff accounts

Accounts with role `staff` or `placement_officer`. **Permission:** `departments.create`, and the controller or form request also requires an **admin**. Others get 403 `Only admins can manage staff accounts.`

### GET /staff

**200 OK:** a bare array, ordered by name.

```json
[{
  "id": 7, "name": "Asha Raman", "email": "asha@college.edu", "role": "staff",
  "title": "Head of Department", "designationId": 3, "designationName": "Head of Department",
  "departmentCode": "CSE", "permissions": ["dashboard.view", "marks.approve", "..."]
}]
```

### POST /staff

**Headers:** `Content-Type: application/json`, or `multipart/form-data` when sending `image`.

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `email` | string | required, email, unique among users |
| `password` | string | required, min 6 |
| `role` | string | nullable, `staff` (default) or `placement_officer` |
| `designationId` | integer | required, existing designation |
| `departmentCode` | string | required, existing department |
| `phone` | string | nullable, max 30 |
| `communicationAddress` | string | nullable |
| `permanentAddress` | string | nullable |
| `emergencyContactPerson` | string | nullable, max 255 |
| `emergencyContactNumber` | string | nullable, max 30 |
| `biometricId` | string | nullable, max 255, unique among users |
| `experienceYears` | integer | nullable, ≥ 0 |
| `specialization` | string | nullable, max 255 |
| `image` | file | nullable, image, max 5 MB |

```json
{
  "name": "Kiran Das", "email": "kiran@college.edu", "password": "temp1234",
  "role": "staff", "designationId": 3, "departmentCode": "CSE",
  "phone": "+91 98xxxxxx33", "experienceYears": 4, "specialization": "Networks"
}
```

The new account is created in the caller's institution with email already verified.

**201 Created:** `{ "data": CampusDataset }`

### PUT /staff/{staff}

Same fields. `password` is optional. To send `image`, use `POST /staff/{staff}` with `_method=PUT` as multipart.

**200 OK:** `{ "data": CampusDataset }`

**404** when `{staff}` is not a staff or placement-officer account.

### DELETE /staff/{staff}

Revokes the account's tokens and soft-deletes it.

**200 OK:** `{ "data": CampusDataset }`

---

## Invitations

Admins invite students, staff and placement officers by email. **Permission:** `users.create` (admins). The invitee side (preview and accept) is public and documented in [01-auth-and-account.md](01-auth-and-account.md#get-invitationsaccepttoken).

`Invitation` shape:

```json
{
  "id": 18,
  "email": "new.staff@college.edu",
  "role": "staff",
  "departmentCode": "CSE",
  "designationId": 3,
  "designationName": "Head of Department",
  "status": "pending",
  "invitedBy": "Institution Admin",
  "expiresAt": "2026-11-04T09:00:00+00:00",
  "acceptedAt": null,
  "revokedAt": null,
  "createdAt": "2026-10-28T09:00:00+00:00"
}
```

`status` is `pending`, `accepted`, `revoked` or `expired`.

### GET /invitations

| Query | Rules |
|---|---|
| `status` | optional, `pending`, `accepted`, `revoked`, `expired` |
| `search` | optional, matches email |
| `per_page` | optional, 1–100, default 25 |
| `page` | optional |

**200 OK:** resource paginator of `Invitation`.

### POST /invitations

**Rate limit:** `uploads`. The caller must belong to an institution (Super Admin gets 403).

| Field | Type | Rules |
|---|---|---|
| `emails` | string[] | required, 1–200 addresses. Trimmed, lower-cased and de-duplicated. |
| `role` | string | required, `student`, `staff` or `placement_officer` |
| `departmentCode` | string | required, existing department |
| `designationId` | integer | **required for `staff` and `placement_officer`**, nullable for students |

```json
{ "emails": ["a@college.edu", "b@college.edu"], "role": "staff", "departmentCode": "CSE", "designationId": 3 }
```

Addresses that already have an account are skipped. An earlier pending invitation to the same address is revoked and replaced.

**201 Created**

```json
{
  "data": [Invitation],
  "skipped": [{ "email": "b@college.edu", "reason": "An account with this email already exists." }],
  "message": "1 invitation(s) sent, 1 skipped."
}
```

### POST /invitations/{invitation}/resend

Issues a new token (the old link stops working), clears any revocation and emails it again.

**200 OK:** `{ "data": Invitation }`

**409:** `This invitation has already been accepted.`

### DELETE /invitations/{invitation}

Revokes a pending invitation.

**200 OK:** `{ "data": Invitation }` with `status: "revoked"`.

**409:** `Only pending invitations can be revoked; this one is accepted.`

---

## Registration approvals

The queue of students who registered themselves. **Permission:** `students.create`.

`Registration` shape:

```json
{
  "id": 55,
  "name": "Rahul Menon",
  "email": "rahul@college.edu",
  "departmentCode": "CSE",
  "studentId": 41,
  "registrationNumber": "CSE2026041",
  "status": "pending_approval",
  "statusReason": null,
  "emailVerified": true,
  "registeredAt": "2026-10-27T18:30:00+00:00"
}
```

### GET /registrations

| Query | Rules |
|---|---|
| `status` | optional, `pending_approval` (default) or `rejected` |
| `per_page` | optional, 1–100, default 25 |
| `page` | optional |

**200 OK:** resource paginator of `Registration`, oldest first.

### POST /registrations/{registration}/approve

`{registration}` is the **user** id (`id` above). Sets status to `active` and emails the student.

**200 OK:** `{ "data": Registration }`

**409:** `This registration has already been reviewed.`

### POST /registrations/{registration}/reject

| Field | Type | Rules |
|---|---|---|
| `reason` | string | required, 3–500 characters. Shown to the student when they try to sign in. |

```json
{ "reason": "Not enrolled in the 2026 intake." }
```

Sets status to `rejected`, revokes the account's tokens and emails the student.

**200 OK:** `{ "data": Registration }`

**409:** `This registration has already been reviewed.`
