# 08 — Pre-Production Audit (Frontend, Backend, SaaS Readiness)

| Item | Value |
|---|---|
| Date | 16 November 2026 |
| Snapshot | Branch `feat/p1-exams-academics`: last commit `43f25bd` plus **uncommitted** work for P1 part 3, P2 and P3 (department portal, timetable, imports and exports, fees, documents, LMS, recruiter portal, SMS, housekeeping) |
| Method | Read the code, routes, migrations and configuration; ran `php artisan route:list --json` and analysed the middleware on every route; searched callers from the frontend; ran both test suites |
| Tests executed | Backend `php artisan test`: **268 passed, 3,103 assertions** (SQLite). Frontend `vitest run`: 34 files. In the parallel run, 6 tests in 5 files timed out at 5 s; the same 5 files **passed** when run alone |
| Not verified | MySQL locally (CI has a MySQL 8 job), browser end-to-end flows, load or performance measurements, live SMS, email or AI providers, penetration testing, the production deployment |
| Rule followed | Read-only audit: no existing file was changed. This document is the only new file |

Legend: ✅ confirmed working (code traced and covered by tests) · 🟡 partial · 🔴 missing or broken · ⚠️ risk (possible, not shown to fail). **Confirmed** = the defect is visible in the code. **Risk** = the code allows a failure that was not reproduced.

---

## A. Executive summary

**Overall health.** The campus product (institution setup, academics, attendance, marks and results, students and staff, placement, LMS, fees record-keeping, documents, AI career features, customization) is functionally broad and mostly real. Each campus module has a backend, tenant isolation, permission checks and automated tests. Data integrity has improved in the last three releases (P0–P3).

**Main problem: owner console (SaaS operator side).** Several operator features **look finished in the UI but do nothing in the backend**:

1. **Backups are simulated.** "Trigger backup" records a *completed* backup with a made-up size and S3 path. No backup is taken (`OwnerDataController::triggerBackup`).
2. **Plan limits and plan features are not enforced.** Limits for students, faculty, campuses, departments, recruiters, storage and API calls, and feature flags (placement, AI interviews, resume AI…), are stored and displayed, but no campus code reads them.
3. **There is no payment gateway.** The "payment webhook" is an owner-only endpoint behind login, with no signature check. All billing is manual.
4. **Outbound webhooks are never sent**, and the "Send test" button records a fake HTTP 200. Integration "tests" check only that fields are filled in.
5. **Platform announcements are never delivered**, and data-subject requests (export or erase) only change a status.
6. **AI credits can go negative.** Usage is charged after the AI call with `allowNegative: true` and no check beforehand.

**Production readiness.** The campus product is not blocked by critical defects found here; it needs the medium-severity fixes (concurrency, bootstrap size, file storage). The **SaaS operating layer is not production-ready**: billing, plan enforcement, backups and data-subject requests must be real before institutions are charged or their data is held.

**Most critical gaps.** AUD-01 (backups), AUD-02 (plan enforcement), AUD-03 (billing gateway), AUD-07 (data-subject requests), AUD-04 (AI credit overspend).

---

## B. Architecture assessment

| Layer | What exists | Assessment |
|---|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 6, React Router 7, TanStack Query 5, Tailwind UI kit (`components/ui`). Two apps in one bundle: campus workspace (`/app/:tab`) and owner console. An offline demo mode runs when no API is configured | Sound. `CampusWorkspace.tsx` is **6,340 lines** and holds large commented-out JSX blocks, so it is hard to change safely |
| Backend | Laravel 12, PHP 8.2+, Sanctum bearer tokens, Spatie permissions (guard `sanctum`), Actions/Services layers for newer modules, older modules have logic in controllers | Sound; style differs between older and newer modules (G-CON-1) |
| API | 541 routes under `/api/v1`: campus 391, owner 150. 13 routes need no login (auth, invitation, 4 signed file links, owner login). 45 routes still return **sample data** and 17 are marked deprecated | Contract style mixed (`{data, meta}` camelCase vs raw models) |
| Database | MySQL 8 (SQLite in tests), 74 migrations, 113 models; soft deletes on 37 models | Keys are unique per institution (fixed by `2026_10_20_000002`) |
| Multi-tenancy | Shared database, `institution_id` column, `BelongsToInstitution` trait + `InstitutionScope` on 64 models, `SetTenant` middleware runs **before** route-model binding, queued jobs use `Tenant::runAs` | Good. The scope **fails open** when no tenant is set (AUD-10) |
| AuthN / AuthZ | Sanctum tokens (12 h expiry, pruned daily), login, register, reset, email verification, session list and revoke; MFA **for owner console only**. Spatie permissions synced from designation at login; `Gate::before` gives admins everything; owner permissions via the `owner:` middleware | Good. 43 write routes check permissions inside the controller rather than in route middleware; spot checks (exams, custom fields, fees, LMS, recruiter, department portal) found the checks present |
| Background work | Database queue; 6 jobs; queued notifications; scheduler: idle interviews (5 min), token prune (daily), offer expiry (hourly), owner status changes (15 min), heartbeat | Single container runs Apache, queue worker and scheduler under supervisord (`backend/Dockerfile`) |
| Integrations | AI provider (metered), mail, SMS (new: log/Twilio/MSG91), no payment gateway, no outbound webhooks | See AUD-03, AUD-05 |
| Deployment / CI | Docker image with `/up` health check; GitHub Actions: SQLite tests, MySQL migrate/rollback, MySQL tests, frontend lint, tests and build, Docker build | Good baseline. No error monitoring, no off-container file storage |

---

## C. Module inventory

**Campus:** Auth and sessions · Institution setup (departments, courses, subjects, designations, batches, campuses, master options, settings) · Academic years and semesters · Classes and rosters · Timetable · Subject allocations · Exams · Attendance · Marks, review, publishing, results, revaluation, grade rules, mark schemes · Students (records, career profile, resume, skills, photo, documents) · Staff, designations, roles and permissions · Department portal (HOD) · Bulk import · Exports · Fees · LMS (materials, assignments, submissions) · Placement (jobs, eligibility, pipeline, rounds, offers, policy) · Recruiter portal · Notifications (in-app, email, SMS) · Announcements · Dashboards and widgets · Reports · AI (resume analysis, interviews, readiness, skill gaps) · Customization (custom fields, custom modules, sidebar layout) · Audit log.

**Owner console:** Institutions and lifecycle · Plans and versions · Subscriptions · Billing (invoices, payments, refunds, coupons, tax) · AI credits and rate cards · Platform users and roles · Onboarding CRM · Support tickets · Communications (platform announcements, CMS, releases) · Integrations, API clients, webhooks · Data (backups, data-subject requests) · Reports and schedules · System health · Security · Oversight.

---

## D. Frontend audit

| Area | Finding | Evidence | Type |
|---|---|---|---|
| Live screens | Every campus tab rendered with a live API calls a real endpoint. Sample screens are shown only when no API is configured | `CampusWorkspace.tsx` switch: e.g. `isApiConfigured() ? <ExamsModule/> : <ExamCoordinatorModule/>`, same for placement, LMS, notifications | ✅ |
| Dead client code | 58 functions in `api/campusApi.ts` call `/staff/*` or `/student/{assignments,materials,notifications}` sample routes. **43 have no caller**; 15 are used only by offline-demo screens (`ExamCoordinatorModule`, `PlacementOfficerModule`, `StudentNotifications`, `StudentAssignmentsMaterials`) | grep of each function name | Confirmed (maintainability) |
| Token storage | Bearer token in `localStorage` (`App.tsx:139`, `api/core.ts:37`). Any XSS would expose it. No `dangerouslySetInnerHTML` or `innerHTML` writes found, which lowers the risk | — | ⚠️ |
| State refresh | TanStack Query mutations invalidate their query family (`ownerKeys.all`, `['recruiter']`, `['lms']`, etc.) | api files | ✅ |
| Loading, error and empty states | Present on the new modules (skeletons, `Alert`, empty cards). Older screens inside `CampusWorkspace.tsx` are not consistent | — | 🟡 |
| Size | `CampusWorkspace.tsx` 6,340 lines including commented-out JSX (e.g. lines ~3516–3570) | `wc -l` | Confirmed (maintainability) |
| Owner console UI | Shows backups, webhooks, integration tests and announcements as working. The backend simulates them (section E) | — | 🔴 misleading UI |
| Test coverage gaps | No tests for owner `ReportsPage` and `IntegrationsPage` (schedule pause/delete and webhook toggle were added without tests). No browser end-to-end tests | grep of test files | Confirmed |

## E. Backend audit

| Area | Finding | Evidence | Type |
|---|---|---|---|
| Unauthenticated routes | 13; all expected (auth, invitations, 4 **signed** file links with 5-minute expiry, owner login) | route analysis | ✅ |
| Rate limiting | Limiters for login, register, invitation, password reset, verification, API (120/min), uploads (10/min), exports (5/min), AI | `AppServiceProvider.php:65-91` | ✅ |
| Institution suspension | Checked on every request, not just at sign-in | `SetTenant.php:31-35` | ✅ |
| Upload validation | Real endpoints restrict type and size. **Sample** endpoints accept files with no size limit and report success without storing anything (`Api/Student/MaterialsController::submitAssignment`, `Api/Staff/MarksController:145`) | — | Confirmed (low, sample routes) |
| Password policy | `StoreStaffMemberRequest` allows 6 characters; everywhere else requires `Password::min(8)` | `app/Http/Requests/Staff/StoreStaffMemberRequest.php:30` | Confirmed (low) |
| Transactions | `DB::transaction` used in 50 files; row locks (`lockForUpdate`) only in marks, results, interviews, AI credits and billing | grep | See AUD-09 |
| Simulated owner operations | Backups, integration test, webhook test, payment webhook, platform announcements, data-subject requests, report schedules | Section M | 🔴 |
| Sample and deprecated routes | 45 return `X-Data-Source: sample`, 17 send `Deprecation` headers; still deployed in production | route analysis | Confirmed (low) |

## F. Frontend–backend gap matrix

Status: **Full** = UI, API, logic and data present and covered by tests · **Partial** · **Frontend only** · **Logic missing** = endpoint exists but does not do what the UI says · **Broken** · **Not implemented**.

| # | Feature | Frontend | Backend | Status | Gap |
|---|---|---|---|---|---|
| 1 | Sign-in, reset, verification, sessions | ✅ | ✅ | Full | — |
| 2 | MFA for campus users | — | — | Not implemented | Owner console only (AUD-13) |
| 3 | Institution setup masters | ✅ | ✅ | Full | — |
| 4 | Academic years and semesters | ✅ | ✅ | Full | — |
| 5 | Classes and rosters | ✅ | ✅ | Full | — |
| 6 | Timetable with clash checks | ✅ | ✅ | Full | — |
| 7 | Subject allocations | ✅ | ✅ | Full | — |
| 8 | Exam scheduling | ✅ | ✅ | Full | — |
| 9 | Exam seating and invigilation | Offline demo only | Sample routes | Frontend only | No real model |
| 10 | Attendance mark, approve, correct, export | ✅ | ✅ | Full | — |
| 11 | Marks entry, review, publish, results | ✅ | ✅ | Full | — |
| 12 | Grade rules and mark schemes | ✅ | ✅ | Full | — |
| 13 | Student records and custom fields | ✅ | ✅ | Full | Field-level security missing (G-SEC-3) |
| 14 | Career profile, resume, AI features | ✅ | ✅ | Full | AI cost control: AUD-04 |
| 15 | Student documents | ✅ | ✅ | Full | Local disk: AUD-12 |
| 16 | Staff, designations, roles | ✅ | ✅ | Full | — |
| 17 | Department portal (HOD) | ✅ | ✅ | Full | — |
| 18 | Bulk import (CSV) | ✅ | ✅ | Full | — |
| 19 | Exports (CSV) | ✅ | ✅ | Full | — |
| 20 | Fees (record-keeping) | ✅ | ✅ | Partial | No online payment; concurrency AUD-09 |
| 21 | LMS | ✅ | ✅ | Full | Local disk: AUD-12 |
| 22 | Placement pipeline and offers | ✅ | ✅ | Full | Concurrency AUD-09 |
| 23 | Recruiter portal | ✅ | ✅ | Full | No recruiter limit (AUD-02) |
| 24 | Notifications in-app and email | ✅ | ✅ | Full | — |
| 25 | SMS notifications | ✅ | ✅ | Partial | Drivers tested against faked HTTP only |
| 26 | Campus announcements | ✅ | ✅ | Full | — |
| 27 | Dashboards and widgets | ✅ | ✅ | Full | — |
| 28 | Reports tab | 🟡 | 🟡 | Partial | `GET /reports/summary` unused; part of the tab is sample (G-RPT-2) |
| 29 | Customization (fields, modules, sidebar) | ✅ | ✅ | Partial | Plan phases 2–7 (G-CUS-1) |
| 30 | Audit log | ✅ | ✅ | Full | — |
| 31 | Owner: institutions and lifecycle | ✅ | ✅ | Full | — |
| 32 | Owner: plans | ✅ | ✅ | Partial | Limits and features not enforced (AUD-02) |
| 33 | Owner: subscriptions | ✅ | ✅ | Full | Depends on manual payments |
| 34 | Owner: billing and payments | ✅ | 🟡 | Partial | No gateway (AUD-03) |
| 35 | Owner: AI credits | ✅ | 🟡 | Partial | Overspend (AUD-04) |
| 36 | Owner: users and roles | ✅ | ✅ | Full | — |
| 37 | Owner: onboarding CRM | ✅ | ✅ | Full | Not deep-verified |
| 38 | Owner: support tickets | ✅ | ✅ | Full | — |
| 39 | Owner: platform announcements | ✅ | 🔴 | Logic missing | Never delivered (AUD-06) |
| 40 | Owner: integrations test | ✅ | 🔴 | Logic missing | Simulated (AUD-05) |
| 41 | Owner: outbound webhooks | ✅ | 🔴 | Logic missing | Never dispatched; test is fake (AUD-05) |
| 42 | Owner: backups and restore check | ✅ | 🔴 | Broken | Simulated (AUD-01) |
| 43 | Owner: data-subject requests | ✅ | 🔴 | Logic missing | Status only (AUD-07) |
| 44 | Owner: report schedules | ✅ | 🟡 | Partial | Never executed (AUD-08) |
| 45 | Owner: system health | ✅ | ✅ | Full | — |

## G. Business-logic gap analysis

| Rule | Source | Implemented? | Note |
|---|---|---|---|
| An institution's usage stays within its plan's limits | Plan fields `student_limit` … `api_requests_limit` (owner UI and `PlanVersion`) | **No** | Inferred from the fields' existence; no enforcement point (AUD-02) |
| Plan features switch modules on or off | `PlanVersion::FEATURE_KEYS` | **No** | Unresolved: should a disabled feature hide the nav, block the API, or both? |
| AI usage stops when credits run out | Owner AI credits screen shows balance and alerts | **No** (alerts only) | Unresolved: hard stop or soft overdraft? Today: unlimited overdraft |
| One-offer rule closes other applications on acceptance | Placement policy | Yes, but **not safe under concurrency** | AUD-09 |
| A fee payment cannot exceed the balance | `FeeController::recordPayment` | Yes, but **not safe under concurrency** | AUD-09 |
| Suspended or closed institutions lose access immediately | `SetTenant` | Yes | — |
| Recruiters see only shortlisted candidates of their company | `RecruiterController` | Yes | Tested |
| HODs grant only designations within their own permissions | `DepartmentPortalController` | Yes | Tested |
| Data-subject export or erasure is carried out | Owner data-requests screen | **No** | Compliance obligation, not only a feature |
| Backups exist and can be restored | Owner backups screen | **No** | — |

## H. End-to-end workflows

| Workflow | Path | Status | Break point |
|---|---|---|---|
| Student onboarding | Admin creates or imports student → user account → set-password email → login | ✅ | Emails need a working mailer; import reports failed sends |
| Attendance | Faculty marks → HOD approves → correction or delete → export | ✅ | — |
| Marks to results | Teacher drafts → submits (locked) → HOD review → publish (lock rows) → student results | ✅ | — |
| Placement | Officer creates job with eligibility → students apply → shortlist → rounds → offer → accept or decline → expiry job | ✅ / ⚠️ | Concurrent accepts (AUD-09) |
| Recruiter | Officer invites → recruiter sets password → sees shortlisted candidates → feedback on history | ✅ | — |
| Fees | Structure → assign to class or students → dues → payment and receipt → void with reason | ✅ / ⚠️ | Concurrent payments (AUD-09); no online collection |
| LMS | Faculty posts assignment → student submits (late rules) → faculty grades | ✅ | Files on local disk (AUD-12) |
| Subscription and billing | Plan → subscription → invoice → **manual** payment entry → renew, pause or suspend | 🟡 | No gateway; no automatic dunning (AUD-03) |
| Disaster recovery | Owner triggers backup → verify restore | 🔴 | Nothing is backed up (AUD-01) |
| Data-subject request | Request → review → "completed" | 🔴 | No export or erasure (AUD-07) |

## I. Database and data integrity

- ✅ Business keys are unique **per institution** (registration number, email, department, course and subject codes). This was fixed by `2026_10_20_000002_add_institution_id_to_tenant_tables.php`.
- ✅ Attendance has a unique key `(student_id, subject_id, attendance_date)`; LMS submissions are unique per `(assignment, student)`; classes are unique per `(course, batch, admission_year)`, enforced by both the database and validation.
- ✅ Soft deletes on 37 models; custom field values are purged on hard delete (P0).
- ⚠️ `users.email` is globally unique, so one person cannot hold accounts at two institutions with the same email. This looks intentional (login by email) but is not documented as a rule.
- ⚠️ Fee receipts use a global sequence (`RCPT-YYYY-{payment id}`), so one institution's receipt numbers show gaps from other institutions' payments. This is cosmetic, but auditors may ask about it.
- Not verified: orphaned rows in a real production database (no data available).

## J. SaaS architecture and security

| Control | Status | Evidence |
|---|---|---|
| Tenant isolation on data | ✅ 64 scoped models; binding after tenant; tests for cross-tenant access | `InstitutionScope`, `SetTenant`, `TenantValidationAndAuditTest` |
| Fail-closed tenancy | ⚠️ Scope adds no filter when no tenant is set | `InstitutionScope.php:18` (AUD-10) |
| Token lifetime | ✅ 12 h, pruned daily; no refresh tokens (users sign in again) | `config/sanctum.php:53` |
| MFA | 🟡 Owner console only | `AttemptLoginAction` |
| Brute force | ✅ Login and reset throttled | `AppServiceProvider` |
| CORS | ✅ Explicit origins, no credentials | `config/cors.php` |
| File access | ✅ Private disk + 5-minute signed URLs | file routes |
| Secrets in repo | ✅ No `.env` tracked | `git ls-files` |
| Webhook and payment authenticity | 🔴 No signed inbound payment webhook exists | AUD-03 |
| Plan and usage enforcement | 🔴 | AUD-02, AUD-04 |
| Data-subject rights | 🔴 | AUD-07 |
| Logging | 🟡 `.env.example` sets `LOG_LEVEL=debug`; no error monitoring service | AUD-14 |

## K. Performance and scalability (no measurements taken)

| Risk | Evidence | What fails as usage grows |
|---|---|---|
| Sign-in bootstrap loads everything | `CampusDataService::buildForUser`: all visible students with applications, skills and summaries; all users for admins; no paging | An institution with 10k+ students gets a slow first load and high memory per request (AUD-11) |
| Files on the container disk | `FILESYSTEM_DISK=local`; one container | Uploads are lost when the container is replaced unless a volume is mounted; cannot run more than one API container (AUD-12) |
| Database queue and cache | `QUEUE_CONNECTION=database`, `CACHE_STORE=database` | Fine at small scale; extra database load at larger scale |
| N+1 queries | Not profiled. Newer controllers eager-load (`with(...)`) | Unknown |

## L. Testing and quality

- Backend: 54 feature test files, 1 unit test file; **268 tests passed**. They cover tenancy, permissions, workflows (marks, placement, fees, LMS, recruiter, SMS, imports and exports) and negative cases (403, 404, 422).
- Frontend: 34 test files, all passing when run alone. 5 heavy files time out under a parallel load at the 5 s default (flaky; raise per-test timeouts or split files).
- CI: MySQL migrate, rollback and tests, frontend lint, tests and build, Docker build.
- Missing: browser end-to-end tests (Playwright or Cypress) for the main workflows; concurrency tests for payments and offers; tests for owner backups, webhooks and announcements (which would have exposed the simulation); load tests.

## M. Critical issues register

| ID | Module | Description | Evidence | Root cause | Business impact | Severity | Recommended fix | Depends on |
|---|---|---|---|---|---|---|---|---|
| AUD-01 | Owner · Data | Backups are simulated: a "completed" record with a fixed size (148.4 / 18.6 / 2.1 MB) and a made-up `s3://` path; "verify restore" only stores the outcome | `OwnerDataController::triggerBackup` (L38–64), `verifyRestore` (L66+) | Placeholder never replaced | False assurance; no recovery after data loss | **Critical** | Real backups (managed DB snapshots or `mysqldump` to object storage via a queued job), record the real size and location, verify with a test restore. Until then, label the screen "not active" | Object storage (AUD-12) |
| AUD-02 | Owner · Plans → Campus | Plan limits and feature flags are never enforced | Only `Owner/*` and `PlanVersion` reference `student_limit` etc.; `FEATURE_KEYS` unused elsewhere | No enforcement layer | Lost revenue; plans cannot be differentiated | **High** | A `PlanEntitlements` service + middleware: block create endpoints over a limit with a clear 422 message, gate feature routes and nav by plan features | Decision on overage behaviour |
| AUD-03 | Owner · Billing | No payment gateway. `POST /owner/payments/webhook` requires an owner login and `billing.manage`, with no signature verification | `routes/api.php:697`, `OwnerBillingController::handleWebhook` | Gateway not chosen | Manual collection; renewals depend on staff | **High** | Integrate a gateway (e.g. Razorpay or Stripe): public webhook route with signature verification and idempotency (already keyed by `gatewayEventId`) | Gateway decision |
| AUD-04 | Owner · AI credits | Usage is charged after the call with `allowNegative: true`; no balance check before calls | `AiCreditService::meterUsage` (L147–188) | Metering only | Unbounded AI cost per institution | **High** | Check the balance in `AiClient` before calling; allow a configurable overdraft; return 402/422 when exhausted | AUD-02 policy |
| AUD-05 | Owner · Integrations | Outbound webhooks are never dispatched; "Send test" writes a fake 200 delivery; integration "test" only checks fields are filled | `OwnerIntegrationController::testWebhook` (L173–185), `testIntegration` (L78); no other writer of `WebhookDelivery` | Placeholder | Customers' integrations silently receive nothing | **High** | Event dispatcher → queued signed HTTP delivery with retries; real provider ping for tests | — |
| AUD-06 | Owner · Communications | Platform announcements (in-app, email, SMS, push) are stored but never shown or sent | `PlatformAnnouncement` used only in owner code; no campus reader | Delivery not built | Operators think institutions were informed | Medium | Deliver through the notification system (in-app + mail + SMS); show a banner in the campus app | — |
| AUD-07 | Owner · Data | Data-subject requests only change status; no export or erasure | `OwnerDataController` status update (L112–140) | Not built | Compliance exposure (DPDP Act / GDPR) | **High** | Export job (ZIP of the person's data) and an erase/anonymise action with an audit trail | Legal review of retention |
| AUD-08 | Owner · Reports | Report schedules are saved but never run | No scheduled command reads `ReportSchedule` | Not built | Recipients never get reports | Medium | Scheduled command: build the report, email it, update `next_run_at` | Mail |
| AUD-09 | Fees, Placement | Race conditions: the fee balance check runs before the transaction with no lock; offer acceptance checks status outside the transaction with no row lock | `FeeController::recordPayment` L181 vs L185; `OfferActions::respond` L73–108 | Missing `lockForUpdate` | Overpayment; two offers accepted despite the one-offer rule | Medium | Lock the `student_fees` row and re-check inside the transaction; lock the student's applications inside the offer transaction | — |
| AUD-10 | Tenancy | Scope fails open when no tenant is set | `InstitutionScope.php:18` | Design choice | A future console command or job without `runAs` would read every institution | Medium (risk) | Fail closed outside HTTP/console allow-lists, or require an explicit `withoutTenant()` | — |
| AUD-11 | Campus bootstrap | Unpaginated load of all visible students and users at sign-in | `CampusDataService::buildForUser` L45–95 | Early architecture | Slow sign-in and high memory for large institutions | Medium | Return only session, permissions and masters at bootstrap; screens already page through `/students` | Frontend screens that read `data.students` |
| AUD-12 | Storage | Uploads on the local container disk; plan `storage_limit_mb` not enforced | `.env.example` `FILESYSTEM_DISK=local`; single-container Dockerfile | Default config | File loss on redeploy; no horizontal scale | Medium | S3-compatible disk for private files (signed URLs already used); enforce the storage quota | — |
| AUD-13 | Auth | No MFA for institution admins; token in `localStorage` | `AttemptLoginAction`; `App.tsx:139` | Scope | An admin account takeover exposes the whole institution | Medium | Offer TOTP for campus admins (reuse the owner MFA); keep strict CSP | — |
| AUD-14 | Operations | No error monitoring; `LOG_LEVEL=debug` in `.env.example` | `config/logging.php`, `.env.example:37` | — | Production errors go unnoticed; noisy logs | Medium | Add Sentry or similar; default `LOG_LEVEL=warning` in production | — |
| AUD-15 | API hygiene | 45 sample and 17 deprecated routes in production; 43 of 58 client functions are dead; sample upload endpoints accept unlimited files and fake success | route analysis; `Api/Student/MaterialsController::submitAssignment` | Legacy | Confusing data source; small abuse surface | Low | Register sample routes only when a demo flag is on; delete the dead client functions | Offline-demo decision |
| AUD-16 | Staff accounts | 6-character minimum password for staff created via `StoreStaffMemberRequest` | L30 | Inconsistent rules | Weak passwords | Low | `Password::min(8)` everywhere | — |
| AUD-17 | Frontend maintainability | `CampusWorkspace.tsx` 6,340 lines with commented-out JSX | file | Growth | Slow, risky changes | Low | Move each tab's renderer into its own component; delete commented blocks | — |
| AUD-18 | Release process | P1 part 3, P2 and P3 are **uncommitted** on the branch (new migrations `2026_11_16_000004`–`000008`) | `git status` | In progress | Not reviewed or run on MySQL CI | Medium | Commit, open a PR, let the MySQL CI job run | — |
| AUD-19 | SMS config | `.env.example` sets `SMS_DRIVER=log`; if copied to production, users who opt in believe they get texts that only go to the log | `.env.example` | Developer default | Missed alerts | Low | Leave empty in production templates; show "SMS (test mode)" when the driver is `log` | — |

## N. Implementation roadmap

**Phase 1: critical fixes**
1. AUD-01 real backups (or hide the screen until they exist).
2. AUD-07 data-subject export and erasure.
3. AUD-09 row locks for fee payments and offer acceptance (+ concurrency tests).
4. AUD-18 commit, review and run MySQL CI on the pending changes.

**Phase 2: functional completion**
1. AUD-02 plan entitlements (limits and features) and AUD-04 AI credit pre-check. Decide the overage policy first.
2. AUD-03 payment gateway with a signed webhook.
3. AUD-05 webhook dispatch and real integration tests; AUD-06 announcement delivery; AUD-08 scheduled reports.
4. Remaining open items: exam seating and invigilation, reports summary, customization phases 2–7, custom-field security (G-SEC-3).

**Phase 3: architecture**
1. AUD-11 slim bootstrap; AUD-12 object storage + storage quota; AUD-10 fail-closed tenancy.
2. AUD-17 split `CampusWorkspace.tsx`; AUD-15 demo-only sample routes and dead client code; unify API conventions (G-CON-1).

**Phase 4: production readiness**
1. AUD-14 error monitoring, production log level, uptime alerts on `/up`.
2. Browser end-to-end tests for onboarding, attendance, marks, placement, fees and billing; load test the bootstrap and list endpoints.
3. AUD-13 MFA for campus admins; CSP header.
4. Backup and restore runbook, tested quarterly; deployment and rollback runbook.

## Final evaluation

Method: the 45 features in matrix F, counted by status. A percentage is given only where this count supports it.

| Dimension | Assessment |
|---|---|
| Feature completeness (matrix F) | **30 of 45 Full (67 %)**: 8 Partial, 1 Frontend only, 1 Not implemented, 4 Logic missing, 1 Broken |
| Campus product (rows 1–30) | **24 of 30 Full (80 %)**: 4 Partial (20, 25, 28, 29), 1 Frontend only (9), 1 Not implemented (2) |
| Owner console (rows 31–45) | **6 of 15 Full (40 %)**: 4 Partial (32, 34, 35, 44), 4 Logic missing (39, 40, 41, 43), 1 Broken (42) |
| Frontend implementation | High for live screens; maintainability debt (AUD-17) |
| Backend implementation | High for campus; simulated operator features (AUD-01, 05–08) |
| API integration | High: every live campus tab calls real endpoints; dead sample client code remains |
| Business-logic completeness | Campus good; SaaS commercial rules missing (AUD-02, 03, 04) |
| Database integrity | Good (per-tenant keys, unique constraints, soft deletes); concurrency gaps (AUD-09) |
| SaaS architecture maturity | Tenancy solid; entitlements, billing and data rights not operational |
| Security readiness | Good baseline; MFA, fail-closed tenancy and monitoring outstanding |
| Testing readiness | Good unit and feature coverage (268 backend tests); no end-to-end, load or concurrency tests |
| Production readiness | **Campus: close** (after Phase 1 items 3–4). **Commercial SaaS operation: not ready** until Phases 1–2 are done |

"Full" means the code path was traced and is covered by automated tests; it does not mean a person checked it in a browser. Scores beyond these counts (for example a security score) are **not given**: there is not enough evidence without a penetration test and production data.
