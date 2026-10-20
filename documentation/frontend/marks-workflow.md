# Marks and Results: Backend Workflow and Frontend

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Backend workflow analysis and the frontend built on it |
| Based on | `main` after commit `116a1a5`, Campus Academics addendum (A3, A5, A9) |
| Version | 1.0 draft |
| Date | 20 October 2026 |
| Status | Draft for review |
| Audience | Development, Design, Product |

## M1. Summary

The marks and results workflow is the largest backend workflow with real tables and no frontend: grade rules, mark schemes, mark entry, review, publishing and student results all have working controllers, but no screen called them. The Marks tab showed a hard-coded table (`components/admin/MarksModule.tsx`) to every role, students included. This change replaces it with the real workflow and fixes three backend defects that blocked it.

## M2. Backend map

How each area of `routes/api.php` is backed today.

| Area | Endpoints | Backed by | Used by the frontend |
|---|---|---|---|
| Auth, campus bootstrap, profile | `/auth/*`, `/campus/*` | Real tables | Yes |
| Master data | `/masters`, `/courses`, `/subjects`, `/semesters`, `/departments`, `/designations` | Real tables | Yes |
| Students, staff, companies, announcements | `/students`, `/staff`, `/companies`, `/announcements` | Real tables | Yes |
| **Marks and results** | `/grade-rules`, `/mark-schemes`, `/mark-entries`, `/mark-review`, `/result-publishing`, `/student/results` | Real tables | **Now yes** (this change) |
| Attendance | `/attendance/*` | Real tables | No: staff screens call the sample `/staff/attendance/*` instead |
| Student attendance, marks, timetable | `/student/attendance`, `/student/marks`, `/student/timetable` | Real tables | Partly |
| Student materials, assignments, notifications | `/student/materials`, `/student/assignments`, `/student/notifications` | Sample data (`X-Data-Source: sample`) | Yes |
| Staff portal | every `/staff/*` route (attendance, marks, management, placement, exam coordinator, department, reports) | Sample data | Yes |
| Not built | exams and exam types (create), batches, timetable CRUD, revaluation, academic summary, fees | — | — |

The next workflow with the same gap is attendance: real `/attendance/*` endpoints exist (mark, approve, reports) while the staff screens use the sample `/staff/attendance/*`.

## M3. The workflow

```
Set up                      Enter (faculty)          Review (HOD / exam coordinator / admin)        Publish (exam coordinator / admin)
grade rules ─┐
mark schemes ┴─► exam ─► draft ──submit──► submitted ──verify──► verified ──approve──► approved ──publish──► locked
                          ▲                    │                     │                                         │
                          └──── send back (reason) ◄─────────────────┘                                         │
                                                                         approved ◄──── unlock (reason, logged) ┘
```

| Step | Endpoint | Permission | Rule enforced by the API |
|---|---|---|---|
| Grade rules | `GET/POST/DELETE /grade-rules`, `POST /grade-rules/setup-defaults` | view: `marks.view`; change: `marks.create` | Score bands may not overlap |
| Mark schemes | `GET/POST/DELETE /mark-schemes`, `GET /mark-schemes/semester/{id}/subjects` | as above | total = internal + external |
| Pick exam | `GET /exams?semester_id=` (new) | `marks.view` | — |
| Load sheet | `POST /mark-entries/get-students` | `marks.view` | 422 if the subject has no mark scheme |
| Save draft | `POST /mark-entries/save-draft` | `marks.create` | Total and grade calculated from the scheme and grade rules |
| Submit | `POST /mark-entries/submit` | `marks.create` | Moves every draft of the exam + subject to submitted |
| Verify | `POST /mark-review/{entry}/verify` | `marks.approve` | Not from draft |
| Approve | `POST /mark-review/{entry}/approve` | `marks.approve` | Only from verified |
| Send back | `POST /mark-review/{entry}/reject` | `marks.approve` | Reason required; entry returns to draft |
| Publish | `POST /result-publishing/publish` | `marks.publish` | Refused while any entry is not approved; creates semester results, locks entries, writes a log |
| Unlock | `POST /result-publishing/unlock` | `marks.publish` | Reason required; entries back to approved; logged |
| Student results | `GET /student/results/all`, `/student/results/semester/{id}` | `marks.view` | Published semesters only |

## M4. Frontend

| Screen | File | Shown to |
|---|---|---|
| Workflow shell: 4-step stepper, shared semester choice | `components/marks/MarksWorkflowModule.tsx` | Marks tab, every role except student |
| 1 Set up: grade rules table, "Use default rules", mark schemes per semester with an add form (total computed) | `MarksSetupPanel.tsx` | `marks.view`; editing with `marks.create` |
| 2 Enter marks: semester → exam → class sheet with internal / external / extra / absent, per-row limit checks, Save draft, Submit for review | `MarksEntryPanel.tsx` | `marks.create` |
| 3 Review: counts, status filter, Verify / Approve / Send back with a reason, pagination | `MarksReviewPanel.tsx` | `marks.view`; actions with `marks.approve` |
| 4 Publish: readiness bar by status, Publish (only when every entry is approved), Unlock with a reason, publishing log | `ResultPublishingPanel.tsx` | `marks.view`; actions with `marks.publish` |
| My results: cumulative GPA, published semesters, per-subject marks | `StudentResultsView.tsx` | Marks tab for students |
| API client and types | `api/marksApi.ts` | — |

Design rules followed: status chips carry a word, not only a colour (Draft, Submitted, Verified, Approved, Published); destructive actions confirm first; publish and unlock state what students will see; every action button is at least 44px high; offline demo mode shows a notice instead of fake data.

## M5. Backend changes in this change

| Change | File | Why |
|---|---|---|
| Removed the `default:…` validation rules (5 places) | `MarkEntryController`, `GradeRuleController`, `MarkSchemeController` | Laravel has no `default` rule. Sending `is_absent`, `sort_order`, `extra_marks_allowed` or `is_active` threw an exception (HTTP 500), so marks could not be saved at all. Database defaults already cover missing values |
| `setupDefaults()` deletes only the caller's rules | `GradeRuleController` | `GradeRule::truncate()` ignores the institution scope and emptied every institution's grade rules. Rules are force-deleted so the per-institution unique score bands are free for the defaults |
| New `GET /exams` (read-only, `semester_id` / `subject_id` filters) | `ExamController`, `Requests/Exams/ListExamsRequest`, `routes/api.php` | Marks are entered against an exam, and no endpoint listed exams |
| Test: resetting grade rules keeps another institution's rules | `tests/Feature/TenantIsolationTest.php` | Regression test for the truncate defect |

## M6. Backend issues not fixed

| # | Issue | Where | Effect | Frontend handling |
|---|---|---|---|---|
| 1 | No API creates exams or exam types, and nothing seeds them | — | The workflow can't be run end to end until exams exist | Entry step says no exams are scheduled |
| 2 | `get-students` returns every student of the institution, not the exam's class or semester | `MarkEntryController::getStudentsForEntry` | Long sheets; marks can be entered for the wrong students | None |
| 3 | Internal / external marks are not checked against the scheme's maximums | `saveDraft`, `store` | Out-of-range marks are accepted | Sheet blocks saving with a per-row message |
| 4 | `reject` works from any status, including locked | `MarkReviewController::reject` | A published entry can be sent back to draft | "Send back" shown only for submitted and verified |
| 5 | `can_publish` is true while verified entries remain; publish then refuses | `ResultPublishingController::getPublishingStatus` | Misleading flag | `publishReadiness()` computes readiness from the counts |
| 6 | The rejection reason is not returned in the entry sheet | `getStudentsForEntry` | Faculty can't see why an entry came back | None |
| 7 | Review stats count a `published` status that never exists (published entries are `locked`) | `getSubmittedMarks` | Always 0 | Not displayed |
| 8 | Grade points are on a 4-point scale (`gpa` max 4); institution settings propose a 10-point CGPA | `GradeRuleController` | Scale mismatch with the eligibility rules | None |
| 9 | Two migrations create `exams` with different columns; the first to run wins | `2026_04_11_150000_…`, `2026_04_11_170006_…` | Schema depends on migration order | `GET /exams` reads the columns of the first |

## M7. Verification

- Done: `npx tsc --noEmit` and `vite build` pass; `php -l` passes on every changed PHP file.
- Not done: running the screens in a browser, running `php artisan test` (backend dependencies are not installed in the reviewed checkout), or exercising the workflow against data, since no exams exist (M6 #1).
