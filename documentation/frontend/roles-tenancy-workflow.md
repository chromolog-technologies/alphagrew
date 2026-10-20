# Roles and Tenancy: Frontend Workflow

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Frontend workflow for the roles and multi-tenancy backend change |
| Based on | Commits `d065d44`, `0da2f42`, `116a1a5` (20 October 2026) |
| Version | 1.0 draft |
| Date | 20 October 2026 |
| Status | Draft for approval |
| Audience | Development, Design, Product |
| Screens | [Roles and Tenancy: Frontend Design](roles-tenancy-design.md) |

## W1. Summary

The backend now enforces six roles and per-institution isolation, but the React app only renamed the roles. Registration, the Super Admin console, paginated students and tenant error states are not built in the UI yet. This document lists the gaps and the ten tickets (F1–F10) that close them, in W2–W4 of the 22-week plan.

## W2. What was pulled

| Commit | Area | Files | What it does |
|---|---|---|---|
| `d065d44` | Docs | 6 | PRD addenda in `documentation/prd/` (User Roles and Access, Data Model Changes, Campus Academics) and `backend/ARCHITECTURE.md` |
| `0da2f42` | Frontend | 5 | Six-role `CampusRole` type, `isAdminRole` / `isInstitutionStaffRole` helpers, Placement Officer nav, per-record student updates, `fetchStudentsPage()` and a new `registerWithCampusApi` payload |
| `116a1a5` | Backend | 94 | `UserRole` enum, `institutions` table, `institution_id` on 20 tables, `SetTenant` middleware, `BelongsToInstitution` trait, `TenantRule`, and `CampusController` split into six controllers with FormRequests, Actions, DTOs and Resources |

The backend commit reports 41 passing tests, including `TenantIsolationTest` and `RoleModelTest`.

## W3. What the backend now enforces

| Area | Backend behaviour | What the frontend must do |
|---|---|---|
| Roles | `super_admin`, `institution_admin`, `placement_officer`, `staff`, `student`, `recruiter`. Old `admin` users became `institution_admin`; TPO staff became `placement_officer` | Route each role to its portal. Never compare roles as string literals |
| Tenant | `SetTenant` takes the institution from the user, never from the request. A user with no institution gets 403. Super Admin bypasses the scope | Never send an institution id. Show the current institution in the header |
| Cross-institution | Reading or writing another institution's record returns 404 | Show a "not found" state, not a generic error |
| Registration | `POST /auth/register` requires `institutionCode` and `departmentCode`. An unknown code returns 422 with a field message | Sign-up form with both fields and inline field errors |
| Recruiter | Login is refused: "The recruiter portal is not available yet. Contact the placement office of the institution that invited you." | Show the message clearly on the login screen |
| Students | `GET /students` is paginated (`page`, `per_page` ≤ 100). Create and update return `{ student, user }`; delete returns 204 | Paginated table with search; merge records locally after a write |
| Session | Login returns `role`, `institutionId` and the permission list, but not the institution's name or code | Backend adds them (ticket F2) |
| Super Admin | Created only by `php artisan alphagrew:super-admin`. No console API yet; a Super Admin uses the admin portal | Console shell now, endpoints later (P1 in the roles addendum) |

## W4. Frontend gaps

Ordered by impact.

| # | Gap | Evidence | Impact |
|---|---|---|---|
| 1 | No sign-up screen; `registerWithCampusApi({ institutionCode, departmentCode })` is never called | `frontend/src/components/auth/CampusLogin.tsx` is login-only | Students cannot self-register (acceptance criterion 26) |
| 2 | Errors lose their HTTP status; every failure becomes `new Error(message)` | `frontend/src/api/apiClient.ts:68`, `frontend/src/api/campusApi.ts:154` | 404, 403 and 422 look the same; field errors can't show under their inputs |
| 3 | `fetchStudentsPage()` has no callers; the Students page renders the whole bootstrap dataset | `frontend/src/api/campusApi.ts:210` | Large institutions load every student at login |
| 4 | No institution shown anywhere; the session has only `institutionId` | `backend/app/Services/Campus/CampusDataService.php:205` | Users can't see which institution they are in |
| 5 | Super Admin gets the institution-admin nav titled "Platform overview" | `frontend/src/components/layouts/CampusWorkspace.tsx:474`, `:1761` | No institution list, onboarding or audit view (criterion 23) |
| 6 | Designation checks use `role === 'staff'` and miss placement officers, who keep their designation as a job title | `App.tsx` designation staff count, rename sync and delete guard | A designation held only by a placement officer shows 0 staff and can be deleted (offline demo mode). The other `role === 'staff'` checks (department scope, HOD lookup) are correct: they match `StudentPolicy`, which limits only `staff` to its department |
| 7 | `baseNavByRole` is still keyed `'admin' \| 'staff' \| 'student'` | `CampusWorkspace.tsx:423` | Cosmetic: `navByRole`, which the app reads, is already keyed by `CampusRole` |
| 8 | Login shows only the `admin@demo.com` demo account | `CampusLogin.tsx:61` | `placement@demo.com` and the other demo accounts can't be found |
| 9 | Role permissions are copied by hand from the backend | `frontend/src/campusTypes.ts` (`campusRolePermissions`) | Drifts from `CampusPermission.php`; the server's list should win |
| 10 | `RecruiterDashboard.tsx` exists but has no route | `frontend/src/components/staff/RecruiterDashboard.tsx` | Fine for the pilot (P3); the login refusal must read well |

## W5. Tickets

F1–F3 go first: every later screen needs status-aware errors, the institution in the session and correct role checks.

| # | Ticket | Stage | Owner | Depends on | Done when |
|---|---|---|---|---|---|
| F1 | `ApiError` class with `status` and `errors` (field map); `request()` throws it | 1 Foundations | Jijin | — | 401, 403, 404 and 422 can be told apart in a component, with a unit test |
| F2 | Backend: add `institution: { id, name, code, logoUrl }` to the login and `/auth/me` payload | 1 Foundations | Neethu | — | `CampusApiTest` asserts the field; null for Super Admin |
| F3 | Use `isInstitutionStaffRole` in the designation checks; keep the department-scope checks on `staff` | 1 Foundations | Jijin | — | A designation held by a placement officer counts as in use; Placement Officer smoke test passes |
| F4 | Header institution badge and role chip; sidebar shows the portal name per role | 2 Shell | Jijin + Akhila | F2 | Each of the 5 demo roles sees the right portal name and institution |
| F5 | Tenant states: 404 "Record not found", 403 "You don't have access", 401 "Session expired" | 2 Shell | Jijin + Akhila | F1 | Opening another institution's `/students/{id}` shows the 404 state, not a toast |
| F6 | Sign-up screen: name, email, password, institution code, department; inline 422 errors | 3 Screens | Jijin | F1 | A student registers with `DEFAULT` + `CSE` and lands in the student portal; a wrong code shows the field message |
| F7 | Login: demo account picker for all 5 roles; recruiter refusal shown as an info panel | 3 Screens | Jijin | F1 | Every demo role signs in with one click; the recruiter message renders as written |
| F8 | Students page paginated: 25 / 50 / 100 per page with search and department filter. Moves to `fetchStudentsPage()` once `GET /students` takes `search` and `department` and the bootstrap stops sending every student | 3 Screens | Jijin (+ Neethu for the API params) | F1 | 500 seeded students load page by page; create, update and delete merge without a reload |
| F9 | Super Admin console shell: institution list, "Act as institution", audit placeholder | 4 Platform | Jijin + Neethu | F2, F4, backend endpoints | A Super Admin sees every institution and enters one with a visible banner |
| F10 | Use the server's `permissions` array as the only source in API mode; drop the hand-copied `campusRolePermissions` | 4 Platform | Jijin | F3 | Nav is driven by login permissions only; offline demo mode keeps its copy behind a flag |

```
Stage 1 Foundations      Stage 2 Shell        Stage 3 Screens          Stage 4 Platform
F1 ApiError ──────────┬─► F5 Error states     F6 Sign-up ◄── F1        F9 Super Admin ◄── F2, F4
F2 Session institution ┴─► F4 Header badge    F7 Login     ◄── F1        F10 Server permissions ◄── F3
F3 Role checks                                F8 Students  ◄── F1
```

## W6. Per-ticket workflow

Each ticket follows the per-feature workflow and Definition of Done in the Updated Delivery Workflow. For these tickets in particular:

1. Akhila confirms the screen against [the design](roles-tenancy-design.md) before the build starts.
2. Jijin builds against the real API (`VITE_API_BASE_URL` set), not offline demo mode.
3. A ticket that reads institution data adds a case to `backend/tests/Feature/TenantIsolationTest.php` or a frontend test signed in as a second institution.
4. Role checks use `isAdminRole` / `isInstitutionStaffRole` or the server's permission list, never `role === '...'`.
5. Neethu reviews the PR; the PO accepts it at the Friday staging demo.

### Implementation status (20 October 2026)

| # | Status | What was built |
|---|---|---|
| F1 | Done | `src/api/apiError.ts`: `ApiError` with `status`, `errors` and `fieldError()`. Thrown by `request()` in `campusApi.ts`, by `apiCall()` in `apiClient.ts` and by the two upload helpers |
| F2 | Not started (backend) | The frontend already reads an optional `session.institution` (`CampusInstitution` in `campusTypes.ts`) and shows it as soon as the backend sends it |
| F3 | Done | The three designation checks in `App.tsx` use `isInstitutionStaffRole` |
| F4 | Done | Header shows the portal name (`campusPortalLabels`), an institution badge and a role chip (`campusRoleLabels`). The Profile panel shows the role label and institution. Until F2, institution users see the demo campus name |
| F5 | Done | `components/shared/TenantState.tsx`. `App.tsx` routes every handler error through `reportApiError`: 401 returns to login with "Your session has expired", 403/404 replace the tab content until **Go back** or a tab change, anything else keeps the red banner |
| F6 | Done | `components/auth/CampusSignUp.tsx`, opened from the login screen. Department is a code field until a public departments endpoint exists. 422 messages show under each field. Offline demo mode explains that sign-up needs the API |
| F7 | Done | Login lists one demo account per role (from `CampusDemoSeeder` in API mode, from the local dataset offline). A 403 at login (recruiter, inactive institution) shows as an info panel. `VITE_HIDE_DEMO_ACCOUNTS=true` hides the picker |
| F8 | Done in the browser | The Students table pages the filtered list (25 / 50 / 100). Server paging waits for the API params above |
| F9 | Not started | Needs the Super Admin endpoints |
| F10 | Not started | |

Checked: `npx tsc --noEmit` and `vite build` pass. Not checked: the screens in a browser, or against the running API (backend dependencies are not installed in the reviewed checkout).

## W7. Verification still to do

This review read the code and diffs only. Nothing was run.

- [ ] `composer install && php artisan test` in `backend/` and confirm the 41 passing tests
- [ ] `npm ci && npx tsc --noEmit` in `frontend/`
- [ ] `php artisan migrate:fresh --seed` on PostgreSQL 16. Both new migrations were written against MySQL and SQLite, while the delivery plan moves to PostgreSQL in W1

## W8. Open questions

1. The code now uses `institution_id`, while the Detail Tables, Implementation Guide and Delivery Workflow docs still say `college_id`, `SetCollegeContext` and `BelongsToCollege`. Who updates them?
2. Super Admin "act as institution" needs a backend endpoint and an audit log entry. Who builds it, and in which week?
3. Should sign-up list departments once the code is entered? That needs a public `GET /institutions/{code}/departments`. Fallback: a free-text department code.
4. Spatie teams mode is deferred. The roles addendum lists it as P0 and the backend status note says it is not needed yet. The PO should confirm.
