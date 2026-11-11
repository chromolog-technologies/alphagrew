# Placement workflow and notifications

Jobs with deterministic eligibility, the application pipeline, rounds, offers, placement policies, and in-app notifications (PRD v1.1 §6 and §10). Paths are relative to `/api/v1`. Every endpoint needs a **Bearer** token and runs inside the caller's institution. Fields are camelCase.

These endpoints use the job-posting model (`placement_drives`, `job_postings`, `eligibility_rules`, `job_applications`, `job_application_events`, `placement_rounds`, `placement_results`). The older `/companies` and `/staff/placement/*` endpoints remain for the offline demo screens. `POST /companies/{company}/apply` now applies to the company's job here, so the same rules apply.

---

## Model

**A job** is a posting with its drive and company. The web app creates one drive per job. Saving a job also keeps the company's legacy columns (role, package, drive date, status, eligible departments) in step with its latest job.

**Application lifecycle.** Every change writes an event with the actor and an optional note, and notifies the student.

```
applied → shortlisted → in_rounds → selected → offered → placed
   ↘ rejected (from applied, shortlisted, in_rounds, selected)
   ↘ withdrawn (by the student, before an offer)
offered → offer_declined | offer_expired
```

**Eligibility rules** on a job are combined with AND.

| Field | Operators | Value | Source |
|---|---|---|---|
| `cgpa` | `gte`, `lte` | number | academic summary, falling back to `students.cgpa` |
| `active_backlogs`, `backlog_history` | `lte`, `eq` | number | academic summary |
| `attendance_percentage` | `gte` | number | academic summary, falling back to `students.attendance` |
| `department`, `year` | `in`, `not_in` | list of strings | student |
| `batch` | `in` | batch codes or graduation years | the student's batch |
| `class_10_score`, `class_12_score` | `gte` | percentage | **verified** education records; a 10-point CGPA is converted × 9.5 |
| `skill` | `gte` | `{ "skillId": 12, "minLevel": 3 }` (level 1–5) | student skills (verified level first) |
| `profile_completion` | `gte` | percentage | career profile |

Each rule evaluates to `{ field, label, operator, expected, actual, passed }`, for example `{ "label": "CGPA", "expected": "≥ 7.5", "actual": "6.8", "passed": false }`. The rules in force are stored on the application when the student applies (`eligibilitySnapshot`).

**Blockers** are policy and process checks on top of the rules. Each is `{ code, message }`.

| Code | When |
|---|---|
| `job_closed` | The job is a draft or closed |
| `deadline_passed` | After `applyDeadline` |
| `email_unverified` | The student's email is not verified |
| `opted_out` | The student opted out of placements this season |
| `debarred` | Debarred until a future date |
| `already_placed` | One-offer rule: the student accepted an offer. With dream offers enabled, one more job whose CTC is at least `dreamOfferMinCtc` (LPA) is allowed. |
| `application_limit` | `maxActiveApplications` reached |
| `profile_incomplete` | Below `minProfileCompletion` |

A student can apply when they are eligible and nothing blocks them (`canApply`).

---

## Student endpoints

**Permission.** Reading needs `placement.view`; acting needs `placement.apply`. Applying also needs a verified email (the `verified` route rule).

### GET /students/me/jobs

Open jobs, plus closed jobs the student applied to. Each job includes `assessment` (`eligible`, `canApply`, `rules`, `blockers`) and `application` when the student has one.

```json
{
  "data": [{ "id": 4, "title": "Graduate Engineer", "company": { "id": 2, "name": "Acme" }, "packageDisplay": "6–8 LPA",
             "applyDeadline": "2026-11-21T23:59:00+05:30", "status": "open", "isOpen": true,
             "assessment": { "eligible": false, "canApply": false,
                             "rules": [{ "field": "cgpa", "label": "CGPA", "operator": "gte", "expected": "≥ 7.5", "actual": "6.8", "passed": false }],
                             "blockers": [] } }],
  "placement": { "optedOut": false, "debarredUntil": null, "debarReason": null, "placedAt": null,
                 "policy": { "oneOfferRule": true, "dreamOfferEnabled": false, "dreamOfferMinCtc": null,
                             "maxActiveApplications": null, "minProfileCompletion": 0, "offerResponseDays": 7 } }
}
```

### GET /students/me/jobs/{job}

One job in the same shape. **404** for a draft the student has not applied to.

### POST /students/me/jobs/{job}/apply

- **201** returns the new application.
- **200** returns the existing application when the student has already applied.
- **422** when the student cannot apply: `message` is the first reason, `reasons` lists all of them in plain words, and `rules` and `blockers` are included. Applying again after withdrawing also gives 422.

### GET /students/me/applications

The student's applications, newest first. Each includes `job`, `events`, `roundResults` and `offer`.

### POST /students/me/applications/{application}/withdraw

Optional `reason`. Allowed until an offer is made; with an offer, decline it instead. **404** for another student's application.

### POST /students/me/applications/{application}/offer/accept · /offer/decline

- **Accept** moves the application to `placed` and sets the student's legacy `placed_company` and `status`. Under the one-offer rule the student's other open applications are withdrawn, and other pending offers are declined, each with a note.
- **Decline** moves it to `offer_declined`.
- After the respond-by date the offer expires and the call gives **422**.

### PUT /students/me/placement-preference

`{ "optedOut": true }` opts the student out of this season's placements; `false` opts them back in. Returns the `placement` state.

---

## Officer endpoints

**Permissions.**
- Reads need `placement.view_results`. Students hold `placement.view` but must not see other applicants.
- Create needs `placement.create`.
- Changes, status moves, offers and debarment need `placement.manage`.
- Rounds need `placement.schedule_round`.

Every change is audit-logged.

### GET /placement/jobs?status=draft|open|closed

Jobs with `eligibility` and `counts` (per status plus `total`), and `companies` for the editor.

### POST /placement/jobs · PATCH /placement/jobs/{job}

| Field | Rules |
|---|---|
| `companyId` or `companyName` | One is required. A new name creates the company; an existing name, ignoring case, reuses it. |
| `industry`, `website` | optional, saved on the company |
| `title` | required, max 255 |
| `employmentType` | `full_time`, `internship` or `ppo` |
| `description`, `location` | optional |
| `ctcMinLpa`, `ctcMaxLpa` | optional, 0–1000; max ≥ min |
| `stipendMonthly`, `openings` | optional |
| `requiredSkills` | optional list of strings (shown to students; not a rule) |
| `applyDeadline` | optional date-time |
| `driveDate` | optional date |
| `eligibility` | optional list of `{ field, operator, value }` (table above). When present, it replaces the job's rules. |

New jobs are drafts. **201** / **200** returns the job.

### DELETE /placement/jobs/{job}

**409** when anyone has applied. Close the job instead.

### POST /placement/jobs/{job}/publish · /close

**Publish** opens the job and notifies every student who can apply. The response includes `notified`. It gives **422** if the job is already open or the deadline has passed. **Close** stops applications.

### POST /placement/eligibility/preview

`{ "eligibility": [rules] }` → `{ "data": { "total": 20, "eligible": 12, "excludedByRule": [5, 3] } }`. It counts unsaved rules for the editor; `excludedByRule[i]` is how many students rule `i` excludes on its own.

### GET /placement/jobs/{job}/eligible-students?filter=eligible|ineligible|all

Every student, with `eligible`, `canApply`, `failedRules`, `blockers` and `applicationStatus`. `summary` gives `total`, `eligible` and `applied`.

### GET /placement/jobs/{job}/applications?status=

Applications with `student` (including CGPA), `events` (with actor names) and `roundResults`.

### POST /placement/applications/status

`{ "applicationIds": [..], "status": "shortlisted" | "in_rounds" | "selected" | "rejected", "note"?: "…" }`. Each application must allow the move, or the call gives **422** with `allowed`. Each student is notified.

### POST /placement/applications/{application}/offer

Optional `ctcLpa` (defaults to the job's CTC), `respondBy` (a date; defaults to today + `offerResponseDays`) and `note`. The application must be `selected`. The student is notified.

### Rounds

| Method | Path | Notes |
|---|---|---|
| GET | `/placement/jobs/{job}/rounds` | With `results` |
| POST | `/placement/jobs/{job}/rounds` | `name`, `type` (`aptitude`, `technical`, `coding`, `group_discussion`, `interview`, `hr`, `other`), `scheduledAt`, `durationMinutes`, `description`. Shortlisted and in-round candidates are notified. |
| PATCH | `/placement/rounds/{round}` | Same fields |
| DELETE | `/placement/rounds/{round}` | **409** once results are recorded |
| PUT | `/placement/rounds/{round}/results` | `results: [{ applicationId, status: passed \| failed \| absent, score?, feedback? }]`. Passed → `in_rounds`; failed or absent → `rejected`. Applications from another job give **422**. |

### POST /placement/students/{student}/debar · DELETE …/debar

Debarring takes `until` (today or later) and `reason`. The student cannot apply until that date. The DELETE lifts the debarment.

### Offer expiry

`php artisan placement:expire-offers` runs hourly from the scheduler. It moves offers past their respond-by date to `offer_expired`, and notifies the student and the job's creator.

---

## Notifications

In-app notifications for every role, stored in Laravel's `notifications` table. Each one has a category, a title, a body and an optional link into the app, such as `placement?job=12`. The user's preferences decide whether it is stored in the app and whether it is also emailed. Notifications are queued, so a queue worker must run.

| Category | Sent for | Defaults |
|---|---|---|
| `placement` | New job you are eligible for, application status changes, round scheduled, offer made, offer expired; to the job's creator: offer accepted, declined or expired | in app ✓, email ✓ |
| `academics` | Marks sent back for correction | in app ✓, email ✗ |
| `announcements` | (reserved) | in app ✓, email ✗ |
| `account` | (reserved) | in app ✓, email ✓ |

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications?unread=1&page=&perPage=` | `data: [{ id, type, category, title, body, link, data, readAt, createdAt }]`, `meta: { currentPage, lastPage, total, unreadCount }` |
| POST | `/notifications/{id}/read` | Returns `unreadCount`. **404** for another user's notification. |
| POST | `/notifications/read-all` | |
| DELETE | `/notifications/{id}` | |
| GET | `/notifications/preferences` | `[{ category, label, description, inApp, mail }]` |
| PUT | `/notifications/preferences` | `{ "preferences": [{ "category": "placement", "inApp": true, "mail": false }] }` |

The sample `/student/notifications/*` endpoints were removed.
