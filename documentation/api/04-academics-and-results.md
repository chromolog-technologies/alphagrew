# Academics, marks and results

Paths are relative to `/api/v1`. Every endpoint needs `Authorization: Bearer <token>` and `Accept: application/json`.

## The marks lifecycle

```
draft ──submit──▶ submitted ──verify──▶ verified ──approve──▶ approved ──publish──▶ locked
  ▲                   │                    │                                         │
  └──────reject───────┴────────reject──────┘                     approved ◀──unlock──┘
```

| Step | Endpoint | Who |
|---|---|---|
| Configure grading | `/grade-rules`, `/mark-schemes` | `marks.create` (admins, staff) |
| Enter marks | `POST /mark-entries/save-draft` | Faculty **allocated to the subject** for the exam's semester, or admins |
| Submit | `POST /mark-entries/submit` | Same |
| Verify, approve, reject | `/mark-review/*` | `marks.approve`: HOD for own department, `marks.publish` holders institution-wide, admins |
| Publish, unlock | `/result-publishing/*` | `marks.publish` (Exam Coordinator, admins) |
| Read own results | `/student/results/*` | Students, see [06-student-portal.md](06-student-portal.md#published-results) |

**Students are refused on every staff-side marks endpoint** (mark entries, review, publishing) with 403 `Students can only view their own published results.`, even though they hold `marks.view`.

**Which entries a staff member sees.** Admins and `marks.publish` holders see the whole institution. Everyone else sees only subjects whose course belongs to their own department.

**Class roster.** A subject's roster is every student of the subject's department whose year of study matches the subject's semester (semesters 1–2 are year 1, 3–4 are year 2, and so on).

---

## Exams

### GET /exams

**Permission:** `marks.view`. Read-only list for choosing the exam that marks are entered against. Exams cannot be created through the API yet.

| Query | Rules |
|---|---|
| `semester_id` | optional, existing semester |
| `subject_id` | optional, existing subject |

**200 OK**

```json
{
  "data": [{
    "id": 4, "name": "End Semester Nov 2026", "subject_id": 12, "exam_type_id": 2, "semester_id": 5,
    "exam_date": "2026-11-20", "max_marks": 100, "status": "scheduled",
    "subject": { "id": 12, "name": "Database Systems", "code": "CS305" },
    "exam_type": { "id": 2, "name": "End Semester" }
  }]
}
```

---

## Grade rules

The institution's grading scale. **Permissions:** read `marks.view`, write `marks.create`.

`GradeRule` shape:

```json
{ "id": 1, "grade": "O", "gradePoint": 10, "minScore": 90, "maxScore": 100, "isPass": true, "description": "Outstanding", "sortOrder": 1 }
```

### GET /grade-rules

**200 OK:** `{ "data": [GradeRule] }`, highest band first.

### GET /grade-rules/{gradeRule}

**200 OK:** `{ "data": GradeRule }`

### POST /grade-rules

| Field | Type | Rules |
|---|---|---|
| `grade` | string | required, max 5, unique in the institution |
| `gradePoint` | number | required, 0–10 |
| `minScore` | number | required, 0–100 |
| `maxScore` | number | required, 0–100, ≥ `minScore` |
| `isPass` | boolean | required |
| `description` | string | nullable, max 100 |
| `sortOrder` | integer | nullable, ≥ 0 |

Score bands may not overlap, except the absent grade `Ab`.

**201 Created:** `{ "data": GradeRule }`

**422:** `errors.minScore` = `This score range overlaps grade A.`

### PUT /grade-rules/{gradeRule}

Same body. Applies to marks graded from now on. **200 OK:** `{ "data": GradeRule }`

### DELETE /grade-rules/{gradeRule}

Deleted permanently so the band can be reused. **204 No Content**

### POST /grade-rules/setup-defaults

Replaces the institution's scale with the default 10-point scale. Super Admin gets 422 `Grade rules belong to an institution; sign in as one of its users.`

**200 OK:** `{ "data": [GradeRule] }`

| Grade | Point | Score band | Pass |
|---|---|---|---|
| O | 10 | 90–100 | Yes |
| A+ | 9 | 80–89.99 | Yes |
| A | 8 | 70–79.99 | Yes |
| B+ | 7 | 60–69.99 | Yes |
| B | 6 | 55–59.99 | Yes |
| C | 5 | 50–54.99 | Yes |
| P | 4 | 40–49.99 | Yes |
| F | 0 | 0–39.99 | No |
| Ab | 0 | Absent | No |

---

## Mark schemes

Internal, external and total maximum and pass marks for one subject in one semester. **Permissions:** read `marks.view`, write `marks.create`.

`MarkScheme` shape:

```json
{
  "id": 9, "subjectId": 12, "semesterId": 5,
  "subject": { "id": 12, "code": "CS305", "name": "Database Systems" },
  "semester": { "id": 5, "name": "Semester 5" },
  "internalMax": 40, "externalMax": 60, "totalMax": 100,
  "internalPass": 16, "externalPass": 24, "totalPass": 40,
  "extraMarksAllowed": 5, "isActive": true
}
```

### GET /mark-schemes

| Query | Rules |
|---|---|
| `semesterId` | optional |
| `subjectId` | optional |
| `perPage` | optional, max 200, default 50 |

**200 OK:** resource paginator of `MarkScheme`.

### GET /mark-schemes/{markScheme}

**200 OK:** `{ "data": MarkScheme }`

### POST /mark-schemes

| Field | Type | Rules |
|---|---|---|
| `subjectId` | integer | required, existing subject. One scheme per subject and semester. |
| `semesterId` | integer | required, existing semester |
| `internalMax` | number | required, 0–999 |
| `externalMax` | number | required, 0–999 |
| `totalMax` | number | required, > 0, max 999, **must equal `internalMax + externalMax`** |
| `internalPass` | number | required, 0 to `internalMax` |
| `externalPass` | number | required, 0 to `externalMax` |
| `totalPass` | number | required, 0 to `totalMax` |
| `extraMarksAllowed` | number | nullable, 0–999, default 0 |
| `isActive` | boolean | optional, default true |

```json
{
  "subjectId": 12, "semesterId": 5, "internalMax": 40, "externalMax": 60, "totalMax": 100,
  "internalPass": 16, "externalPass": 24, "totalPass": 40, "extraMarksAllowed": 5
}
```

**201 Created:** `{ "data": MarkScheme }`

**422:** `errors.totalMax` = `Total maximum must equal internal + external maximum.`

### PUT /mark-schemes/{markScheme}

Same body. Allowed only while every mark entry using it is still a draft.

**200 OK:** `{ "data": MarkScheme }`

**422:** `Marks under review or published use this scheme; it cannot be changed.`

### DELETE /mark-schemes/{markScheme}

**204 No Content**

**422:** `Marks have been entered against this scheme; it cannot be deleted.`

---

## Mark entry (faculty)

`MarkEntry` shape:

```json
{
  "id": 301,
  "examId": 4, "subjectId": 12, "studentId": 41,
  "exam": { "id": 4, "name": "End Semester Nov 2026", "semesterId": 5 },
  "subject": { "id": 12, "code": "CS305", "name": "Database Systems" },
  "student": { "id": 41, "name": "Rahul Menon", "registrationNumber": "CSE2026041" },
  "internalMarks": 32, "externalMarks": 47, "extraMarks": 0, "totalMarks": 79,
  "grade": "A", "gradePoint": 8, "result": "PASS", "isAbsent": false,
  "status": "submitted", "remarks": null,
  "enteredBy": 7, "submittedAt": "2026-11-25T10:00:00+00:00",
  "verifiedBy": null, "verifiedAt": null,
  "approvedBy": null, "approvedAt": null, "lockedAt": null
}
```

`result` is `PASS` or `FAIL`. `exam`, `subject` and `student` appear when loaded, which is the case on every endpoint below.

### GET /mark-entries

**Permission:** `marks.view`.

| Query | Rules |
|---|---|
| `examId` | optional |
| `subjectId` | optional |
| `status` | optional, `draft`, `submitted`, `verified`, `approved`, `locked` |
| `perPage` | optional, 1–200, default 50 |

**200 OK:** resource paginator of `MarkEntry`, most recently updated first.

### GET /mark-entries/{markEntry}

**Permission:** `marks.view`. **200 OK:** `{ "data": MarkEntry }`. **404** when outside the caller's visible entries.

### GET /mark-entries/get-students

**Permission:** `marks.create`, plus allocation to the subject in the exam's semester (403 `You are not allocated to CS305 this semester.`).

The class roster with any marks already entered.

| Query | Rules |
|---|---|
| `examId` | required |
| `subjectId` | required |

**200 OK**

```json
{
  "data": {
    "exam": { "id": 4, "name": "End Semester Nov 2026", "semesterId": 5 },
    "subject": { "id": 12, "code": "CS305", "name": "Database Systems", "credits": 4 },
    "markScheme": MarkScheme,
    "students": [
      { "id": 41, "name": "Rahul Menon", "registrationNumber": "CSE2026041", "entry": MarkEntry },
      { "id": 42, "name": "Priya N.", "registrationNumber": "CSE2026042", "entry": null }
    ]
  }
}
```

**422**

- `errors.subjectId` = `This exam is for a different subject.`
- `errors.subjectId` = `No mark scheme is configured for CS305 in this exam's semester.`

### POST /mark-entries/save-draft

**Permission:** `marks.create` and allocation, as above. Creates or updates draft entries in bulk. Grades are computed from the grade rules.

| Field | Type | Rules |
|---|---|---|
| `examId` | integer | required |
| `subjectId` | integer | required |
| `entries` | object[] | required, 1–500 rows |
| `entries.*.studentId` | integer | required, distinct, existing student |
| `entries.*.internalMarks` | number | nullable, 0 to the scheme's `internalMax` |
| `entries.*.externalMarks` | number | nullable, 0 to the scheme's `externalMax` |
| `entries.*.extraMarks` | number | nullable, ≥ 0 |
| `entries.*.isAbsent` | boolean | optional, default false |
| `entries.*.remarks` | string | nullable, max 500 |

```json
{
  "examId": 4,
  "subjectId": 12,
  "entries": [
    { "studentId": 41, "internalMarks": 32, "externalMarks": 47 },
    { "studentId": 42, "isAbsent": true, "remarks": "Medical leave" }
  ]
}
```

**200 OK**

```json
{ "data": { "savedCount": 2, "entries": [MarkEntry] }, "message": "Marks saved as draft." }
```

**422**

- `errors.entries.0.internalMarks` = `Internal marks cannot exceed 40.`
- `These students are not in the CSE department: ECE2026007.`
- `Marks for 3 students are already submitted and can no longer be edited.`

### POST /mark-entries/submit

**Permission:** `marks.create` and allocation. Moves every draft of the class to `submitted`. Entries become read-only for the faculty.

| Field | Type | Rules |
|---|---|---|
| `examId` | integer | required |
| `subjectId` | integer | required |
| `declarationConfirmed` | boolean | required, must be `true` |

```json
{ "examId": 4, "subjectId": 12, "declarationConfirmed": true }
```

**200 OK:** `{ "data": { "submittedCount": 58 }, "message": "Marks submitted for review." }`

**422**

Every roster student needs both internal and external marks, or `isAbsent: true`:

```json
{
  "message": "Incomplete marks entry for 2 students",
  "missingStudents": [{ "id": 42, "name": "Priya N.", "registrationNumber": "CSE2026042" }]
}
```

Other messages: `There are no draft marks to submit.` and `Marks for 1 students exceed the scheme maximum (internal 40, external 60).`

---

## Mark review (HOD and Exam Coordinator)

### GET /mark-review/get-submitted-marks

**Permission:** `marks.view`. The review queue.

| Query | Rules |
|---|---|
| `examId` | optional |
| `subjectId` | optional |
| `status` | optional. Default is `submitted` plus `verified`. |
| `perPage` | optional, 1–200, default 50 |

**200 OK:** resource paginator of `MarkEntry` with an extra `stats` key counting every status for the same filters.

```json
{
  "data": [MarkEntry],
  "links": {}, "meta": {},
  "stats": { "draft": 0, "submitted": 58, "verified": 0, "approved": 0, "locked": 0 }
}
```

### GET /mark-review/exam-summary

**Permission:** `marks.view`.

| Query | Rules |
|---|---|
| `examId` | required |
| `subjectId` | required |

**200 OK**

```json
{
  "data": {
    "exam": { "id": 4, "name": "End Semester Nov 2026" },
    "subject": { "id": 12, "code": "CS305", "name": "Database Systems" },
    "totalStudents": 60, "absentCount": 2, "passCount": 53, "failCount": 7,
    "averageMarks": 61.4, "highestMarks": 94, "lowestMarks": 18,
    "gradeDistribution": { "O": 4, "A+": 9, "A": 12, "F": 5, "Ab": 2 },
    "statusDistribution": { "submitted": 60 }
  }
}
```

### POST /mark-review/{markEntry}/verify

**Permission:** `marks.approve`, plus department rule (403 `You can only verify marks for your own department (CSE).`).

Moves a `submitted` entry to `verified`, optionally moderating marks. Adjusted marks are re-graded.

| Field | Type | Rules |
|---|---|---|
| `remarks` | string | nullable, max 1000 |
| `adjustments` | object | nullable. Only these keys are allowed. |
| `adjustments.internal_marks` | number | nullable, 0 to scheme maximum |
| `adjustments.external_marks` | number | nullable, 0 to scheme maximum |
| `adjustments.extra_marks` | number | nullable, ≥ 0 |

```json
{ "remarks": "Moderated by +2 external", "adjustments": { "external_marks": 49 } }
```

**200 OK:** `{ "data": MarkEntry }`

**422:** `Only submitted marks can be verified; these marks are draft.` or `Adjusted marks exceed the scheme maximum (internal 40, external 60).`

### POST /mark-review/{markEntry}/approve

**Permission:** `marks.approve` and department rule. No body. Moves `verified` to `approved`.

**200 OK:** `{ "data": MarkEntry }`

**422:** `Only verified marks can be approved; these marks are submitted.`

### POST /mark-review/{markEntry}/reject

**Permission:** `marks.approve` and department rule. Sends a `submitted` or `verified` entry back to `draft` and notifies the faculty.

| Field | Type | Rules |
|---|---|---|
| `remarks` | string | required, max 1000 |

**200 OK:** `{ "data": MarkEntry }`

**422:** `Only submitted or verified marks can be rejected; these marks are approved.`

### POST /mark-review/bulk-approve

**Permission:** `marks.approve` and department rule for the subject. Approves every `verified` entry of the subject, optionally for one exam.

| Field | Type | Rules |
|---|---|---|
| `subjectId` | integer | required |
| `examId` | integer | nullable |

**200 OK:** `{ "data": { "approvedCount": 58 }, "message": "Verified marks approved." }`

**422:** `There are no verified marks to approve.`

---

## Result publishing

A semester is published whole, and only once every subject in it has marks and none of them is still `draft`, `submitted` or `verified`.

### GET /result-publishing/status

**Permission:** `marks.view`. Pre-flight check.

| Query | Rules |
|---|---|
| `semesterId` | required |

**200 OK**

```json
{
  "data": {
    "semesterId": 5,
    "academicYearId": 2,
    "totalSubjects": 6,
    "approvedSubjects": 5,
    "canPublish": false,
    "isPublished": false,
    "approvedEntries": 300,
    "lockedEntries": 0,
    "pendingSubjects": [
      { "subjectId": 14, "code": "CS309", "name": "Compiler Design", "reason": "Marks not yet approved", "draft": 0, "submitted": 12, "verified": 48 }
    ]
  }
}
```

`reason` is `No marks entered` or `Marks not yet approved`.

### POST /result-publishing/publish

**Permission:** `marks.publish`.

| Field | Type | Rules |
|---|---|---|
| `semesterId` | integer | required |

In one transaction it locks every approved entry, writes each student's semester result (credit-weighted SGPA, credits, pass or fail), logs the action, and queues CGPA and backlog recalculation for the affected students.

**200 OK**

```json
{
  "data": {
    "id": 3, "semesterId": 5, "action": "published",
    "studentsCount": 60, "entriesCount": 360, "ipAddress": "10.0.0.5", "reason": null,
    "details": "Published Semester 5: 360 marks for 60 students.",
    "createdAt": "2026-12-01T10:00:00+00:00"
  },
  "message": "Results published for 60 students."
}
```

**422**

```json
{ "message": "Cannot publish Semester 5: 1 subjects are not fully approved.", "pendingSubjects": [ ... ] }
```

Other messages: `Results for Semester 5 are already published.` and `Cannot publish Semester 5: there are no approved marks.`

### POST /result-publishing/unlock

**Permission:** `marks.publish`. Returns locked marks to `approved`, withdraws the semester results from students, and recalculates their summaries.

| Field | Type | Rules |
|---|---|---|
| `semesterId` | integer | required |
| `reason` | string | required, 10–1000 characters, kept in the log |

```json
{ "semesterId": 5, "reason": "Re-evaluation of CS305 answer scripts approved." }
```

**200 OK:** `{ "data": PublishingLog, "message": "Results unlocked." }` with `action: "unlocked"`.

**422:** `Results for Semester 5 are not published.`

### GET /result-publishing/logs

**Permission:** `marks.view`.

| Query | Rules |
|---|---|
| `semesterId` | optional |
| `perPage` | optional, 1–200, default 50 |

**200 OK:** resource paginator of `PublishingLog`, newest first, with `semester` (name) and `publishedBy: { "id", "name" }` filled.

---

## Student academics (staff side)

The student's own view of these is in [06-student-portal.md](06-student-portal.md#academics-and-prior-education).

`AcademicSummary` shape:

```json
{
  "cgpa": 8.42,
  "activeBacklogs": 0,
  "backlogHistory": 1,
  "attendancePercentage": 87.5,
  "subjectsPublished": 24,
  "semestersPublished": 4,
  "source": "results",
  "calculatedAt": "2026-12-01T10:05:00+00:00"
}
```

`backlogHistory` counts subjects ever failed. `source` is `results` when calculated from published results, or `manual` when it still reflects the hand-entered CGPA.

`EducationRecord` shape:

```json
{
  "id": 3, "level": "class_12", "boardOrUniversity": "CBSE", "institutionName": "KV Hebbal",
  "yearOfPassing": 2023, "scoreType": "percentage", "score": 91.4,
  "verified": true, "verifiedAt": "2026-10-20T11:00:00+00:00", "verificationRemarks": null
}
```

### GET /students/{student}/academics

**Permission:** `students.view`. Staff: own department only (403 `You can only view students in your own department.`).

**200 OK**

```json
{ "data": { "summary": AcademicSummary, "education": [EducationRecord] } }
```

Education is ordered class 10, class 12, diploma, UG, PG. The summary is calculated on first read if none exists.

### GET /students/{student}/academic-summary

**Permission:** `results.view_summary` (admins, placement officers). Used for placement eligibility.

**200 OK:** `{ "data": AcademicSummary }`

### POST /students/{student}/academics/recalculate

**Permission:** `students.edit` (admins). Staff with the permission: own department only. No body.

**200 OK:** same body as `GET /students/{student}/academics`.

### POST /students/{student}/education/{education}/verify

**Permission:** `students.edit`, department rule. Verifies or rejects a prior-education record against documents. **404** when the record is not this student's.

| Field | Type | Rules |
|---|---|---|
| `verified` | boolean | required |
| `remarks` | string | max 255. **Required when `verified` is false.** |

```json
{ "verified": false, "remarks": "Mark sheet does not match the entered score." }
```

**200 OK:** `{ "data": EducationRecord }`
