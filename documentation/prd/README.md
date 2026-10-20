# PRD Addenda

Changes to the Alphagrew Master Product Documentation v1.0 (Chromolog Technologies), based on a review of the current codebase. Each addendum is a draft for approval and states which section of the master document it extends.

| Addendum | Extends | Covers |
|---|---|---|
| [User Roles and Access](user-roles-and-access.md) | Section 4 | Six roles, role vs designation, Spatie teams, account creation, migration of existing accounts |
| [Data Model Changes](data-model-changes.md) | Section 14 | Table-by-table status against the code, rules for every table, migration order |
| [Campus Academics Module](campus-academics-module.md) | Section 5.1 | Attendance, timetable, exams, marks and results, fees; CGPA and backlog feed for eligibility |

Acceptance criteria continue the numbering of Section 30: 15–22 in Campus Academics, 23–27 in User Roles and Access.

Implementation specs built on these addenda:

- [Student Journey — Backend Specification](../student-journey-backend-spec.md): all 16 steps of §7.1 with endpoints, tables, rules, events and build order.
- [Placement Officer Journey — Backend Specification](../placement-officer-journey-backend-spec.md): all 13 steps of §7.2 with decoupled drives/jobs, eligibility engine, applications pipeline, rounds, interviews, offers, and reporting.
- [Recruiter Journey — Backend Specification](../recruiter-journey-backend-spec.md): all 10 steps of §7.3 with corporate onboarding, company profile, job requirements, candidate pool, assessments, scorecards, calibration, and offer management.
- [AI Interview Journey — Backend Specification](../ai-interview-journey-backend-spec.md): all 13 stages of §8/§9 with resume parsing, profiling, dynamic planning, turn-by-turn follow-ups, adaptive difficulty, rubrics, skill gaps, and readiness scoring.
- [Academic Results & Mark Processing — Backend Specification](../academic-results-backend-spec.md): marks lifecycle (grade rules, schemes, faculty drafts, submit, verify/approve, publish & lock, student results), derivation of CGPA/backlogs, and the formal resolution for `marks.approve` RBAC.
