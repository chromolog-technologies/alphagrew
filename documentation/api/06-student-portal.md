# Student portal

Paths are relative to `/api/v1`. Every endpoint needs `Authorization: Bearer <token>` and `Accept: application/json`, except the two signed file URLs at the end.

**Student only.** Every `/students/me/*` and `/interviews/*` endpoint, and `/student/results/*`, require a signed-in **student account with a linked student record**. Any other role gets 403 `Only student accounts can manage their own profile.` A record that belongs to another student answers **404**.

The other `/student/*` endpoints (attendance, marks, timetable, materials, assignments, notifications) only check the route permission. Several of them are sample data or have defects. See the notes on each and [08-known-issues.md](08-known-issues.md).

| Area | Endpoints |
|---|---|
| Career profile | `/students/me/profile`, `/students/me/profile/photo` |
| Academics | `/students/me/academics`, `/students/me/education` |
| Skills | `/skills`, `/students/me/skills` |
| Projects, experience, certifications | `/students/me/projects`, `/students/me/experience`, `/students/me/certifications` |
| Resume profile (builder) | `PUT /students/me/resume` |
| Uploaded resumes and ATS analysis | `/students/me/resumes` |
| AI mock interviews | `/students/me/interviews`, `/interviews/{interview}/*` |
| Readiness and recommendations | `/students/me/readiness*`, `/students/me/recommendations` |
| Published results | `/student/results/*` |
| Legacy portal | `/student/attendance`, `/student/marks`, `/student/timetable`, `/student/materials`, `/student/assignments`, `/student/notifications` |

---

## Career profile

### GET /students/me/profile

**Permission:** `profile.view`.

**200 OK**

```json
{
  "data": {
    "studentId": 41,
    "name": "Rahul Menon",
    "email": "rahul@college.edu",
    "registrationNumber": "CSE2026041",
    "departmentCode": "CSE",
    "headline": "Final-year CSE student, backend and data",
    "about": "I build ...",
    "dateOfBirth": "2004-05-12",
    "phone": "+91 98xxxxxx21",
    "alternateEmail": null,
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "linkedinUrl": "https://linkedin.com/in/rahul",
    "githubUrl": "https://github.com/rahul",
    "portfolioUrl": null,
    "photoUrl": "http://localhost:8000/api/v1/files/student-photos/41?expires=...&signature=...",
    "preferredRoles": ["Backend Developer"],
    "preferredLocations": ["Bengaluru", "Remote"],
    "willingToRelocate": true,
    "visibility": { "contact": false, "links": true, "academics": true, "projects": true, "certifications": true, "experience": true, "skills": true },
    "completeness": {
      "percent": 80,
      "sections": { "basics": true, "contact": true, "links": true, "photo": true, "preferences": true, "skills": true, "projects": true, "experience": false }
    },
    "completedAt": null
  }
}
```

`photoUrl` is a signed URL valid for 10 minutes, or `null`. `completedAt` is set when completeness first reaches 100%.

**Completeness weights**

| Section | Weight | Done when |
|---|---|---|
| `basics` | 15 | headline and about are filled |
| `contact` | 10 | phone and city are filled |
| `links` | 10 | any of LinkedIn, GitHub or portfolio |
| `photo` | 5 | a photo is uploaded |
| `preferences` | 10 | at least one preferred role |
| `skills` | 20 | at least 3 skills |
| `projects` | 15 | at least 1 project |
| `experience` | 15 | at least 1 experience or certification |

### PUT /students/me/profile

**Permission:** `profile.edit`. **Partial update:** fields you leave out are unchanged.

| Field | Type | Rules |
|---|---|---|
| `headline` | string | nullable, max 160 |
| `about` | string | nullable, max 2000 |
| `dateOfBirth` | date | nullable, at least 14 years ago |
| `phone` | string | nullable, max 30 |
| `alternateEmail` | string | nullable, email |
| `city`, `state`, `country` | string | nullable, max 100 |
| `linkedinUrl`, `githubUrl`, `portfolioUrl` | string | nullable, URL, max 255 |
| `preferredRoles` | string[] | nullable, max 5 items of max 100 |
| `preferredLocations` | string[] | nullable, max 5 items of max 100 |
| `willingToRelocate` | boolean | nullable |
| `visibility` | object | nullable, map of boolean. Only the keys shown in the response are kept. |

```json
{ "headline": "Final-year CSE student", "city": "Bengaluru", "preferredRoles": ["Backend Developer"], "visibility": { "contact": true } }
```

**200 OK:** same body as `GET /students/me/profile`.

### POST /students/me/profile/photo

**Permission:** `profile.edit`. **Rate limit:** `uploads`. **Headers:** `Content-Type: multipart/form-data`.

| Field | Type | Rules |
|---|---|---|
| `photo` | file | required, JPG or PNG (checked by content), max 2 MB, at least 100×100 px |

**200 OK:** the profile with a new `photoUrl`. The previous photo is deleted.

---

## Academics and prior education

### GET /students/me/academics

**Permission:** `profile.view`.

**200 OK**

```json
{ "data": { "summary": AcademicSummary, "education": [EducationRecord] } }
```

`AcademicSummary` and `EducationRecord` are defined in [04-academics-and-results.md](04-academics-and-results.md#student-academics-staff-side). The summary is read-only and comes from published results.

### POST /students/me/education

**Permission:** `profile.edit`.

| Field | Type | Rules |
|---|---|---|
| `level` | string | required, `class_10`, `class_12`, `diploma`, `ug`, `pg`. One record per level. |
| `boardOrUniversity` | string | required, max 255 |
| `institutionName` | string | required, max 255 |
| `yearOfPassing` | integer | required, 1980 to next year |
| `scoreType` | string | required, `percentage` or `cgpa` |
| `score` | number | required, 0–100 for percentage, 0–10 for CGPA |

```json
{ "level": "class_12", "boardOrUniversity": "CBSE", "institutionName": "KV Hebbal", "yearOfPassing": 2023, "scoreType": "percentage", "score": 91.4 }
```

**201 Created:** `{ "data": EducationRecord }` with `verified: false`.

**422:** `errors.score` = `The score can't be more than 10 for this score type.`

### PUT /students/me/education/{education}

Same body. **Saving clears any staff verification.** **200 OK:** `{ "data": EducationRecord }`

### DELETE /students/me/education/{education}

**204 No Content**

---

## Skills

### GET /skills

**Permission:** `profile.view` (every role holds it). Catalogue search for skill pickers. Returns platform skills plus the institution's own reviewed skills.

| Query | Rules |
|---|---|
| `search` | optional, max 50. Matches name, lookup key and aliases. |
| `category` | optional, `language`, `framework`, `tool`, `domain`, `soft` |
| `limit` | optional, 1–50, default 20 |

**200 OK**

```json
{ "data": [{ "id": 14, "name": "React", "category": "framework", "aliases": ["ReactJS", "React.js"], "isPlatform": true }] }
```

### GET /students/me/skills

**Permission:** `profile.view`.

**200 OK**

```json
{ "data": [{ "skillId": 14, "name": "React", "category": "framework", "level": 4, "verifiedLevel": null, "source": "self" }] }
```

`source` is `self` (rated by the student), `resume` (found in an uploaded resume) or `assessment`.

### PUT /students/me/skills

**Permission:** `profile.edit`. Sends the **full** self-rated list. Self-rated skills not in the list are removed. Skills from resumes or assessments are kept.

| Field | Type | Rules |
|---|---|---|
| `skills` | object[] | present (may be empty), max 50 |
| `skills.*.skillId` | integer | required, distinct, a platform skill or one of the institution's |
| `skills.*.level` | integer | required, 1–5 |

```json
{ "skills": [{ "skillId": 14, "level": 4 }, { "skillId": 3, "level": 3 }] }
```

**200 OK:** same body as `GET /students/me/skills`.

### DELETE /students/me/skills/{skill}

`{skill}` is the skill id. **204 No Content**. **404** when the student does not have that skill.

---

## Projects, experience and certifications

All three sections work the same way.

| Rule | Value |
|---|---|
| Permission | `profile.view` to list, `profile.edit` to write |
| Maximum items per section | 20 (422 `You can add at most 20 entries here.`) |
| `sortOrder` | Optional on create (appended to the end) and kept on update unless sent |
| List | `GET` returns `{ "data": [Item] }` |
| Create | `POST` returns **201** `{ "data": Item }` |
| Update | `PUT .../{id}` returns `{ "data": Item }` |
| Delete | `DELETE .../{id}` returns **204** |

### /students/me/projects

| Field | Type | Rules |
|---|---|---|
| `title` | string | required, max 255 |
| `description` | string | nullable, max 2000 |
| `techStack` | string[] | nullable, max 15 items of max 50 |
| `url` | string | nullable, URL |
| `startDate` | date | nullable |
| `endDate` | date | nullable, ≥ `startDate` |
| `sortOrder` | integer | nullable, 0–999 |

```json
{ "id": 5, "title": "Campus ERP", "description": "...", "techStack": ["Laravel", "React"], "url": "https://github.com/...", "startDate": "2026-01-10", "endDate": null, "sortOrder": 1 }
```

### /students/me/experience

| Field | Type | Rules |
|---|---|---|
| `type` | string | required, `internship`, `job`, `freelance` |
| `organisation` | string | required, max 255 |
| `role` | string | required, max 255 |
| `startDate` | date | required, not in the future |
| `endDate` | date | nullable, ≥ `startDate` |
| `description` | string | nullable, max 2000 |
| `sortOrder` | integer | nullable, 0–999 |

```json
{ "id": 2, "type": "internship", "organisation": "Acme Labs", "role": "Backend Intern", "startDate": "2026-05-01", "endDate": "2026-07-31", "description": "...", "sortOrder": 1 }
```

### /students/me/certifications

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `issuer` | string | required, max 255 |
| `issuedOn` | date | nullable, not in the future |
| `expiresOn` | date | nullable, ≥ `issuedOn` |
| `credentialUrl` | string | nullable, URL |
| `sortOrder` | integer | nullable, 0–999 |

```json
{ "id": 1, "name": "AWS Cloud Practitioner", "issuer": "Amazon", "issuedOn": "2026-03-02", "expiresOn": "2029-03-02", "credentialUrl": "https://...", "sortOrder": 1 }
```

---

## Resume profile (resume builder)

### PUT /students/me/resume

**Permission:** `profile.view`. Saves the resume-builder data shown in `Student.resume`.

| Field | Type | Rules |
|---|---|---|
| `template` | string | required, `classic_ats`, `modern_ats`, `compact_ats` |
| `headline` | string | nullable, max 255 |
| `summary` | string | nullable, max 2500 |
| `targetRole` | string | nullable, max 255 |
| `location` | string | nullable, max 255 |
| `links` | string[] | nullable, items max 255 |
| `certifications` | string[] | nullable, items max 255 |
| `achievements` | string[] | nullable, items max 500 |
| `projects` | string[] | nullable, items max 500 |
| `experience` | string[] | nullable, items max 500 |
| `uploadedResumeText` | string | nullable, max 50,000 |
| `uploadedResumeFileName` | string | nullable, max 255 |

**200 OK:** `{ "data": CampusDataset }`

---

## Uploaded resumes and ATS analysis

**Permission:** `resumes.manage`. Parsing and analysis run as queued jobs after upload, so poll the resume until `status` is `parsed`.

`Resume` shape:

```json
{
  "id": 6, "title": "Backend resume", "fileName": "rahul_cv.pdf", "fileSizeBytes": 182344,
  "mimeType": "application/pdf", "status": "parsed", "parseError": null, "isDefault": true,
  "hasAnalysis": true, "createdAt": "...", "updatedAt": "..."
}
```

`status` moves `uploaded` → `parsing` → `parsed`, or `failed` with `parseError` set. The first resume becomes the default.

### GET /students/me/resumes

**200 OK:** `{ "data": [Resume] }`, newest first.

### POST /students/me/resumes

**Rate limit:** `uploads`. **Headers:** `Content-Type: multipart/form-data`.

| Field | Type | Rules |
|---|---|---|
| `file` | file | required, PDF or DOCX (checked by content), max 5 MB |
| `title` | string | required, max 255 |

**201 Created:** `{ "data": Resume }` with `status: "parsing"`.

**422**

- `errors.file` = `Upload a PDF or Word (.docx) file.`
- `You can keep up to 10 resumes. Delete one to upload another.`
- `You have already uploaded this file.`

### GET /students/me/resumes/{resume}

**200 OK:** `{ "data": Resume }` plus `parsedData` (education, skills, experience and projects extracted from the file) and `overallScore`.

### GET /students/me/resumes/{resume}/analysis

**200 OK**

```json
{
  "data": {
    "resumeId": 6,
    "overallScore": 72,
    "atsCompatibilityScore": 80,
    "sectionScores": { "summary": 60, "skills": 85, "experience": 70 },
    "strengths": ["Clear project descriptions"],
    "improvements": ["Add measurable outcomes to experience bullets"],
    "extractedSkills": ["Java", "SQL", "React"],
    "modelVersion": "deterministic-v1",
    "analyzedAt": "2026-10-28T09:40:00+00:00",
    "note": "These scores are guidance for improving your resume, not a pass/fail judgement."
  }
}
```

**404:** `This resume has not been analysed yet.`

### POST /students/me/resumes/{resume}/analysis

Queues another analysis. **Rate limit:** `ai`. No body.

**202 Accepted:** `{ "data": { "status": "queued" } }`

**422:** `The resume has not been parsed yet.`

### GET /students/me/resumes/{resume}/download

**200 OK**

```json
{ "data": { "url": "http://localhost:8000/api/v1/files/resumes/6?expires=...&signature=...", "expiresAt": "2026-10-28T09:45:00+00:00" } }
```

The URL is valid for 5 minutes and needs no token.

### DELETE /students/me/resumes/{resume}

**200 OK:** `{ "message": "Resume deleted" }`

---

## AI mock interviews

**Permission:** `interviews.practice`. A session moves `planned` → `in_progress` → `evaluating` → `completed`. It can also end as `abandoned` or `failed`. Only one `planned` or `in_progress` session is allowed at a time.

`InterviewSession` shape:

```json
{
  "id": 21,
  "mode": "technical",
  "targetRole": "Backend Developer",
  "targetExperienceLevel": "fresher",
  "baseDifficulty": 2,
  "currentDifficulty": 3,
  "status": "in_progress",
  "timeLimitMinutes": 20,
  "plan": {
    "totalTargetTurns": 8,
    "competencies": [{ "name": "Data structures", "weight": 0.3, "plannedTurns": 3 }]
  },
  "resumeId": 6,
  "jobPostingId": null,
  "endReason": null,
  "consentGivenAt": "2026-10-28T10:00:00+00:00",
  "startedAt": "2026-10-28T10:00:05+00:00",
  "endsAt": "2026-10-28T10:20:05+00:00",
  "endedAt": null,
  "overallScore": null,
  "createdAt": "2026-10-28T09:59:00+00:00"
}
```

`overallScore` appears only in the history list. `mode` is `technical`, `hr`, `resume_deep_dive`, `system_design` or `mixed`.

`Turn` shape:

```json
{
  "id": 140, "sequence": 1, "kind": "question", "competency": "Data structures", "difficulty": 2,
  "questionText": "How would you detect a cycle in a linked list?",
  "questionAudioUrl": null, "askedAt": "2026-10-28T10:00:05+00:00",
  "answerText": null, "answeredAt": null, "answerDurationSeconds": null
}
```

`kind` is `question`, `follow_up`, `clarification` or `system_hint`. A `quickSignal` key is added to each turn only on `GET /interviews/{interview}` after the session is completed, so it never coaches mid-session.

### POST /students/me/interviews

Configures and plans a session. **Rate limit:** `ai`.

| Field | Type | Rules |
|---|---|---|
| `mode` | string | required, see above |
| `targetRole` | string | max 100. **Required unless `jobPostingId` is sent.** Defaults to the job title, then `Software Engineer`. |
| `targetExperienceLevel` | string | optional, `fresher` (default), `junior`, `intermediate` |
| `baseDifficulty` | integer | optional, 1–5, default 2 |
| `resumeId` | integer | nullable, one of your resumes. It must be parsed. Without it the default resume is used when parsed. |
| `jobPostingId` | integer | nullable, existing job posting |
| `timeLimitMinutes` | integer | optional, 10–45, default 20 |

```json
{ "mode": "technical", "targetRole": "Backend Developer", "baseDifficulty": 2, "resumeId": 6, "timeLimitMinutes": 20 }
```

**201 Created:** `{ "data": InterviewSession }` with `status: "planned"`.

**Errors:** 409 `You already have an active interview (#21). Finish it before starting another.` and 422 `This resume has not been parsed yet; wait for parsing to finish or choose another.`

### GET /students/me/interviews

| Query | Rules |
|---|---|
| `status` | optional, any interview status |
| `perPage` | optional, 1–100, default 15 |
| `page` | optional |

**200 OK:** resource paginator of `InterviewSession`, newest first, with `overallScore`.

### GET /interviews/{interview}

**200 OK:** `{ "data": InterviewSession }` plus `turns: [Turn]`.

### POST /interviews/{interview}/start

Records consent and asks the first question. **Rate limit:** `ai`.

| Field | Type | Rules |
|---|---|---|
| `consentAccepted` | boolean | required, must be `true` (consent to recording and AI evaluation) |

**200 OK:** `{ "data": { "firstTurn": Turn } }`

**409:** `This interview is in_progress and cannot be started.`

### POST /interviews/{interview}/turns/{turn}/answer

Answers the current question. **Rate limit:** `ai-answers`.

**Headers:** `application/json` for text, `multipart/form-data` for audio.

| Field | Type | Rules |
|---|---|---|
| `answerText` | string | max 5000. Required unless `audio` is sent. |
| `audio` | file | nullable, WebM or WAV, max 10 MB. Transcribed to text. |

```json
{ "answerText": "I would use Floyd's tortoise and hare algorithm..." }
```

**200 OK**

```json
{ "data": { "nextTurn": Turn, "isCompleted": false } }
```

When the plan is finished or the time limit has passed, `nextTurn` is `null`, `isCompleted` is `true`, and the session moves to `evaluating`.

**Errors**

| Status | Message |
|---|---|
| 409 | `This interview is completed; answers are no longer accepted.` |
| 409 | `This question has already been answered.` |
| 409 | `Only the current question can be answered.` |
| 422 | `Voice answers are not enabled for this institution. Please type your answer.` (no transcription service configured) |
| 422 | `The recording is empty. Please record your answer again.` |
| 422 | `No speech was detected in the recording. Please try again or type your answer.` |
| 422 | `We could not transcribe your recording. Please try again or type your answer.` |

### POST /interviews/{interview}/answers

Same as above, with the turn id in the body. **Rate limit:** `ai-answers`.

| Field | Type | Rules |
|---|---|---|
| `turnId` | integer | required, a turn of this interview |
| `text` or `answerText` | string | max 5000. One of them, or `audio`, is required. |
| `audio` | file | nullable, WebM or WAV, max 10 MB |

**200 OK**

```json
{ "data": { "next": Turn, "nextTurn": Turn, "done": false, "isCompleted": false } }
```

`next` and `nextTurn` are the same value, as are `done` and `isCompleted`.

### POST /interviews/{interview}/finish

Ends the session early and queues the evaluation. **Rate limit:** `ai`.

| Field | Type | Rules |
|---|---|---|
| `reason` | string | nullable, max 40, default `user_ended` |

**202 Accepted:** `{ "data": { "status": "evaluating" } }`. When no question was answered yet, the status is `abandoned` and no evaluation is made.

**409:** `This interview is already completed.`

### GET /interviews/{interview}/evaluation

Also available as `GET /interviews/{interview}/report` with the same response.

**200 OK**

```json
{
  "data": {
    "interviewId": 21,
    "overallScore": 68,
    "dimensionScores": { "technicalDepth": 70, "problemSolving": 65, "communication": 75, "roleFit": 60, "behavioral": 70 },
    "dimensionWeights": { "technicalDepth": 30, "problemSolving": 25, "communication": 20, "roleFit": 15, "behavioral": 10 },
    "competencyBreakdown": [{ "name": "Data structures", "score": 72 }],
    "strengths": ["Explains trade-offs clearly"],
    "weaknesses": ["Misses edge cases"],
    "perTurnEvaluations": [{ "turnId": 140, "score": 70, "feedback": "..." }],
    "recommendations": ["Practise graph problems"],
    "rubricVersion": "v1",
    "modelName": "deterministic",
    "evaluatedAt": "2026-10-28T10:22:00+00:00",
    "note": "Practice feedback to guide your preparation, not a hiring decision."
  }
}
```

**404:** `This interview has not been evaluated yet.` Poll until it is ready.

### GET /interviews/{interview}/skill-gap

**200 OK**

```json
{
  "data": {
    "id": 4, "interviewId": 21, "targetRole": "Backend Developer", "overallMatchPercentage": 64,
    "competencies": [{ "name": "Databases", "required": 4, "demonstrated": 3, "gap": 1 }],
    "generatedAt": "2026-10-28T10:23:00+00:00"
  }
}
```

**404:** `The skill gap report is not ready yet.`

The inner shapes of `competencyBreakdown`, `perTurnEvaluations` and `competencies` come from the AI or deterministic engine. The examples above are illustrative.

---

## Readiness and recommendations

**Permission:** `profile.view`.

### GET /students/me/readiness-score

Also available as `GET /students/me/readiness` with the same response. The score is calculated on first visit.

**200 OK**

```json
{
  "data": {
    "overall": 71.5,
    "components": {
      "resume": { "score": 72, "weight": 20 },
      "academics": { "score": 84, "weight": 25 },
      "assessments": { "score": null, "note": "Not measured yet", "weight": 25 },
      "interview": { "score": 62, "weight": 30 }
    },
    "calculatedAt": "2026-10-28T10:25:00+00:00",
    "history": [{ "overall": 65.0, "trigger": "initial", "calculatedAt": "..." }],
    "note": "A coaching indicator to guide your practice. It is never an employability verdict and never blocks you from applying."
  }
}
```

`overall` averages only the measured components, so it is `null` until at least one is measured. `history` holds up to 20 points, oldest first. Weights are resume 20, academics 25, assessments 25 and interview 30. Assessments are not built yet, so that component is always unmeasured.

### GET /students/me/readiness/history

**200 OK:** `{ "data": [ { "overall", "trigger", "calculatedAt" } ] }`, the same `history` array.

### GET /students/me/recommendations

| Query | Rules |
|---|---|
| `status` | optional, `open` (default), `done`, `dismissed` |

**200 OK**

```json
{
  "data": [{
    "id": 9, "type": "practice", "title": "Practise SQL joins", "detail": "...", "skill": "SQL",
    "action": "Take a database-focused mock interview", "priority": "high", "status": "open",
    "sourceType": "interview", "sourceId": 21, "createdAt": "..."
  }]
}
```

Ordered high, medium, low priority, then newest.

### PATCH /students/me/recommendations/{recommendation}

| Field | Type | Rules |
|---|---|---|
| `status` | string | required, `open`, `done`, `dismissed` |

**200 OK:** `{ "data": Recommendation }`

---

## Published results

**Permission:** `marks.view`. Only published semesters are visible.

### GET /student/results/semesters

**200 OK**

```json
{
  "data": [{
    "id": 5, "name": "Semester 5", "academicYear": "2026-27", "sgpa": 8.6,
    "totalCredits": 22, "creditsEarned": 22, "resultStatus": "PASS", "publishedAt": "2026-12-01T10:00:00+00:00"
  }]
}
```

`resultStatus` is `PASS`, `FAIL` or `WITHHELD`.

### GET /student/results/semester/{semester}

The grade card. `{semester}` is the semester id. **404** until the semester is published.

**200 OK**

```json
{
  "data": {
    "semester": { "id": 5, "name": "Semester 5", "academicYear": "2026-27" },
    "sgpa": 8.6, "totalCredits": 22, "creditsEarned": 22, "resultStatus": "PASS",
    "publishedAt": "2026-12-01T10:00:00+00:00",
    "subjects": [{
      "code": "CS305", "name": "Database Systems", "credits": 4,
      "internalMarks": 32, "externalMarks": 47, "extraMarks": 0, "totalMarks": 79,
      "grade": "A", "gradePoint": 8, "status": "PASS"
    }]
  }
}
```

### GET /student/results/all

**200 OK**

```json
{ "data": { "semesters": [ ...same as /semesters... ], "summary": AcademicSummary } }
```

---

## Legacy student portal endpoints

These return the `{ "success": true, "data": ..., "message": "..." }` envelope and use snake_case.

### GET /student/attendance

**Permission:** `attendance.view`. Per-subject attendance.

```json
{
  "success": true,
  "data": [{ "subject": "Database Systems", "subject_code": "CS305", "total_classes": 40, "present": 34, "absent": 5, "late": 1, "percentage": 85, "status": "good" }],
  "message": "Attendance records retrieved successfully"
}
```

`status` is `good` (≥ 75%), `warning` (≥ 50%) or `critical`. See [08-known-issues.md](08-known-issues.md): this endpoint looks up attendance by user id instead of student id.

### GET /student/attendance/detailed

| Query | Rules |
|---|---|
| `subject_id` | optional |

```json
{
  "success": true,
  "data": [{ "id": 901, "date": "2026-10-27", "subject": "Database Systems", "class": "N/A", "status": "present", "marked_by": "Asha Raman", "remarks": "N/A" }],
  "message": "Detailed attendance records retrieved"
}
```

### GET /student/attendance/statistics

```json
{
  "success": true,
  "data": { "total_classes": 160, "present": 140, "absent": 16, "late": 4, "overall_percentage": 87.5, "status": "good" },
  "message": "Attendance statistics retrieved"
}
```

### GET /student/marks

**Permission:** `marks.view`. Reads the older `marks` table, not the results module.

| Query | Rules |
|---|---|
| `exam_id` | optional |
| `subject_id` | optional |

```json
{
  "success": true,
  "data": {
    "overall_percentage": 74.2,
    "subject_performance": [{ "subject_id": 12, "subject_name": "Database Systems", "subject_code": "CS305", "exams_taken": 2, "average_percentage": 78, "best_grade_percentage": 82, "best_grade": "A", "status": "excellent" }],
    "all_marks": [{ "id": 55, "exam": "Mid Semester 1", "subject": "Database Systems", "marks_obtained": 41, "total_marks": 50, "percentage": 82, "grade": "A", "date": "2026-09-15" }]
  },
  "message": "Marks retrieved successfully"
}
```

Grades here use a fixed scale: A+ ≥ 90, A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, else F.

### GET /student/marks/statistics

```json
{
  "success": true,
  "data": { "total_exams": 8, "average_percentage": 74.2, "best_percentage": 92, "worst_percentage": 51, "grade_distribution": { "A+": 1, "A": 3, "B": 2, "C": 1, "D": 1, "F": 0 } },
  "message": "Mark statistics retrieved"
}
```

### GET /student/timetable

**Permission:** `timetable.view`.

```json
{
  "success": true,
  "data": {
    "all_classes": 24, "learning_hours_per_week": 48, "unique_faculty": 6,
    "daily_schedule": { "Monday": { "classes": 4, "slots": [Slot] }, "Tuesday": { "classes": 4, "slots": [] } },
    "all_slots": [{ "id": 1, "course_code": "CS305", "course_name": "Database Systems", "faculty": "Asha Raman", "day": "Monday", "start_time": "09:00 AM", "end_time": "10:00 AM", "room": "A-101", "building": "A", "semester": 5 }]
  },
  "message": "Timetable retrieved successfully"
}
```

**404:** `{ "success": false, "message": "Student class not found" }`. See [08-known-issues.md](08-known-issues.md): this currently always happens.

### GET /student/timetable/day

| Query | Rules |
|---|---|
| `day` | optional, default `Monday` |

```json
{ "success": true, "data": { "day": "Monday", "classes_count": 4, "slots": [Slot] }, "message": "Timetable for Monday retrieved" }
```

Here each slot also has `time` (`"09:00 AM - 10:00 AM"`).

### Sample-data endpoints

These return hardcoded data and change nothing. They send `X-Data-Source: sample`.

| Endpoint | Permission | Input | Response `data` |
|---|---|---|---|
| `GET /student/materials` | `materials.view` | `type`: `all`, `lecture`, `notes`, `reference`, `video` | `[{ id, title, course, course_code, type, upload_date, download_count, file_size, download_url }]` |
| `GET /student/assignments` | `assignments.view` | `status`: `all`, `pending`, `submitted`, `graded`. `course_id`: a course code or `all`. | `{ assignments: [{ id, title, course, course_code, description, due_date, status, faculty, total_marks, marks, submitted_date }], statistics: { pending_assignments, graded_assignments, average_grade } }` |
| `POST /student/assignments/submit` | `assignments.submit` | multipart: `assignment_id` (required integer), `file` (required, pdf, doc, docx or zip) | `{ assignment_id, submitted_at }` |
| `GET /student/notifications` | `notifications.view` | `type`: `all`, `assignment`, `grade`, `attendance`, `announcement`, `event`, `system`. `unread_only`: `true`. `search`. | `[{ id, title, message, type, read, timestamp }]` plus top-level `statistics: { total_notifications, unread_count }` |
| `POST /student/notifications/mark-as-read` | `notifications.view` | `notification_id` (required integer) | none, `message` only |
| `POST /student/notifications/mark-all-as-read` | `notifications.view` | none | none |
| `DELETE /student/notifications/delete` | `notifications.view` | `notification_id` (required integer) | none |
| `DELETE /student/notifications/delete-all` | `notifications.view` | none | none |
| `GET /student/notifications/preferences` | `notifications.manage` | none | `{ announcements, assignments, grades, attendance, events }` all booleans |
| `PUT /student/notifications/preferences` | `notifications.manage` | booleans `announcements`, `assignments`, `grades`, `attendance`, `events` | none |

Students do not hold `notifications.manage`, so the two preference endpoints answer 403 for them today.

---

## Signed file URLs

No bearer token. Use the URL exactly as the API returned it.

| Endpoint | Returns |
|---|---|
| `GET /files/student-photos/{student}?expires=…&signature=…` | The photo file (JPG or PNG). 404 when there is no photo. |
| `GET /files/resumes/{resume}?expires=…&signature=…` | The resume file (PDF or DOCX). 404 when the file is missing. |

An expired or altered URL returns 403 `Invalid signature.`
