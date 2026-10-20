# User Roles and Access — PRD Addendum

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Addendum to Master Product Documentation v1.0 (PRD / SRS) |
| Replaces | Section 4 "Target Users & Roles" (adds the access model behind it) |
| Version | 1.1 draft |
| Date | 20 October 2026 |
| Status | Draft for approval |
| Audience | Product, Development, QA, Management |

## R1. Summary

The code today has three account types: `admin`, `staff` and `student`. **Designations** (HOD, Exam Coordinator, Training & Placement Officer, Faculty) add permission bundles to staff accounts. Master Documentation v1.0 defines six roles, two of which sit outside any single institution.

This addendum defines the six roles, how roles and designations relate, and how access is limited to one institution.

## R2. Roles

| Role | Belongs to | Lands in | Today in code | Status | Change |
|---|---|---|---|---|---|
| **Super Admin** | Platform (`institution_id = null`) | Super-admin console | `Gate::before` checks a `super_admin` role, but nothing creates it and no screens exist | Missing | New platform role. Bypasses tenant scope; every action audit-logged. Console: institutions, plans, usage, audit logs. |
| **Institution Admin** | One institution | Admin portal | `admin`, which sees every record in the database | Partial | Rename to `institution_admin` and bind to one institution. "Admin sees everything" becomes "admin sees everything in their institution". |
| **Placement Officer** | One institution | Placement portal | `staff` + TPO / Placement designation. `Api/Staff/PlacementController` returns sample data | Partial | First-class role, because the PDF builds a whole journey around it (Section 7.2). Gets `placement.*`, `companies.*` and eligibility permissions, backed by real job, drive and application tables. |
| **Faculty / Trainer** | One institution | Staff portal | `staff` + designations (HOD, Exam Coordinator, Faculty) | Exists | Keep `staff` + designations. Add `assessments.*` permissions and a Trainer designation for external trainers. |
| **Student** | One institution | Student portal | `student`. Self-registration puts every new student in the first department in the table | Partial | Registration must choose an institution (invite link or institution code) and a department. Add profile, resume, assessment and interview permissions. |
| **Recruiter** | One company (`institution_id = null`) | Recruiter portal | A `RecruiterDashboard.tsx` screen exists; no role, table or API | Missing | New external role. Belongs to a company, not an institution. Sees only the candidates and fields an institution has shared through a drive. |

Role identifiers: `super_admin`, `institution_admin`, `placement_officer`, `staff`, `student`, `recruiter`.

## R3. Role vs designation

- **Role** decides the account type and which portal the user lands in. There are six fixed roles. Product owns this list; institutions cannot add roles.
- **Designation** is a job title inside one institution that adds extra permission bundles, such as HOD, Exam Coordinator or Trainer. Each institution defines its own designations.
- A user has exactly one role. Only `staff` users have a designation.
- Effective permissions = role's base permissions + designation's permissions, limited to the user's institution.
- The existing `UserObserver` and `DesignationObserver` sync logic carries over unchanged. Only the scope it applies in changes.

## R4. Permission groups per role

| Permission group | Super Admin | Institution Admin | Placement Officer | Staff (base) | Student | Recruiter |
|---|---|---|---|---|---|---|
| Platform: institutions, plans, usage | ✓ | — | — | — | — | — |
| Institution settings, departments, courses, batches | — | ✓ | — | — | — | — |
| Students, staff, designations | — | ✓ | View students | View students (dept) | Own profile | — |
| Campus Academics (see academics addendum A3) | — | ✓ | CGPA and backlogs only | Per designation | Own | — |
| Companies, jobs, drives, eligibility | — | View | ✓ | — | View eligible | Own company |
| Applications, shortlists, interviews, offers | — | View | ✓ | — | Own | Shared candidates |
| Assessments | — | ✓ | Assign | Per designation | Attempt | Assign to shared candidates |
| Resume and AI interview | — | Reports | Reports | — | Own | Shared reports |
| Announcements, notifications | — | ✓ | Placement only | Per designation | View | — |
| Audit logs | Platform | Own institution | — | — | — | — |

Detailed permission names follow the existing `module.action` pattern in `CampusPermission`. New modules add their own groups (`eligibility.*`, `assessments.*`, `resumes.*`, `interviews.*`, `offers.*`, `institutions.*`, `plans.*`).

`marks.approve` is used by the marks-review routes and the designation seeder but is not declared in `CampusPermission`. It is declared as part of this change.

## R5. Institution scoping of roles (Spatie teams)

- Turn on `'teams' => true` in `config/permission.php` (currently `false`) and use `institution_id` as the team key.
- A middleware sets the team from the logged-in user before each request with `setPermissionsTeamId($user->institution_id)`. A role in institution A then grants nothing in institution B.
- Super Admin and Recruiter have `institution_id = null`:
  - Super Admin passes through `Gate::before` and is not limited by tenant scope.
  - Recruiter access is decided by company → `institution_company` → drives → shared candidate fields, not by Spatie team.
- Request flow:

```
Bearer token → auth:sanctum → SetTenant middleware (tenant + Spatie team)
  → permission:<module.action> → controller → models with institution global scope
```

## R6. Account creation and login

| Role | How the account is created | Login result |
|---|---|---|
| Super Admin | Seeder / command line only | Super-admin console |
| Institution Admin | Super Admin creates it when onboarding an institution | Admin portal of that institution |
| Placement Officer, Staff | Institution Admin creates or invites | Placement or staff portal |
| Student | Institution Admin import/create, or self-registration with an institution invite link or code; department chosen at registration | Student portal |
| Recruiter | Placement Officer invites a company contact, or recruiter self-registers and an institution approves the company link | Recruiter portal |

- Login returns the role, the portal to open and the effective permission list (as today).
- Self-registration without a valid institution code or invite is refused.

## R7. Migration from the current accounts

1. Create the default institution (tenant foundation) and attach all existing users to it.
2. `admin` users become `institution_admin`.
3. `staff` users holding the Training & Placement Officer / Placement designation become `placement_officer`. They keep the designation as their job title; it adds any extra permissions it carries.
4. Other `staff` users keep role and designation.
5. `student` users keep their role.
6. Create the first `super_admin` with `php artisan alphagrew:super-admin {email} {name}`; it is not exposed through any API.
7. Re-sync permissions per institution with Spatie teams on.

### Implementation status (20 October 2026)

Done: the six roles, the `institutions` table and `users.institution_id`, steps 1–6 above (migration `2026_10_20_000001_create_institutions_and_six_roles`), student registration by institution code, Placement Officer accounts through the staff endpoints, `marks.approve`, and a `placement@demo.com` demo account. Recruiter accounts are refused at login until the recruiter portal exists.

Institution scoping of data is done (tenant foundation, see the data model addendum): an Institution Admin, Placement Officer, staff member or student sees and changes only their own institution's data; a Super Admin sees all institutions.

Step 7 (Spatie teams) is deliberately deferred. Every user belongs to exactly one institution and permissions are synced onto each user, so roles and permissions are already per institution. Teams are only needed if one person can hold roles in several institutions (open question 1 below); enabling them now would also require a team id for Super Admin and Recruiter, who have no institution. The Super Admin console is not built; a Super Admin currently uses the admin portal.

## R8. Tests required

1. Each role lands in the correct portal and receives the expected permissions at login.
2. A designation change updates the user's permissions immediately, not only at next login.
3. A user with a role in institution A gets 403/404 on every institution B resource.
4. Super Admin can read across institutions and every such action writes an audit log.
5. Recruiter sees only candidates shared through a drive at a linked institution, and only the fields marked visible.
6. Student self-registration fails without a valid institution code or invite.
7. `marks.approve` is granted to Exam Coordinator and HOD designations and enforced on mark-review routes.

## R9. Acceptance criteria

Continues the numbering of Section 30 and the Campus Academics addendum.

23. A Super Admin can create an institution and its first Institution Admin.
24. An Institution Admin cannot see or change data of another institution.
25. A Placement Officer has a dedicated portal and can manage companies, jobs, drives and applications without admin rights.
26. A student can register only into an institution they were invited to, and chooses a department.
27. A recruiter can see shared candidates for their company's drives and nothing else.

## R10. Priority and dependencies

| Priority | Scope |
|---|---|
| P0 | Institution Admin binding, Placement Officer role, student registration by institution, `marks.approve`, Spatie teams |
| P1 | Super Admin role and minimal console (institutions, admins) |
| P3 | Recruiter role and portal (Section 32 places the Recruiter Portal at P3) |

**Depends on:** the tenant foundation (institutions table and `institution_id` on users, see the data model addendum). Spatie teams cannot be turned on before users carry an institution.

### Open questions for product

1. Can one person hold accounts in two institutions (e.g. visiting faculty), or is it one account per institution?
2. Should the Placement Officer be able to view individual marks, or only the CGPA/backlog summary?
3. Does recruiter company linking need institution approval every time, or once per company?
