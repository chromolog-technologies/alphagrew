# Roles and Tenancy: Frontend Design

| Item | Value |
|---|---|
| Product | Alphagrew |
| Organization | Chromolog Technologies |
| Document | Screen design for tickets F4–F9 of the roles and tenancy workflow |
| Version | 1.0 draft |
| Date | 20 October 2026 |
| Status | Draft for approval |
| Audience | Design, Development |
| Workflow | [Roles and Tenancy: Frontend Workflow](roles-tenancy-workflow.md) |

## D1. Summary

Five screens change: Login, Student sign-up, the workspace shell with the Students page, the Super Admin console, and the tenant error states. They keep the app's current look (navy and sky blue on a light blue-grey ground, system font). Student names, counts and the second institution are sample data; anything in [brackets] is a placeholder.

| Screen | Ticket | Component |
|---|---|---|
| Login with demo role picker | F7 | `components/auth/CampusLogin.tsx` |
| Student sign-up | F6 | new `components/auth/CampusSignUp.tsx` |
| Shell header and Students page | F4, F8 | `components/layouts/CampusWorkspace.tsx` (Students view) |
| Super Admin console | F9 | new `components/admin/PlatformConsole.tsx` |
| Tenant error states | F5 | new `components/shared/TenantState.tsx` |

## D2. Tokens

Taken from `frontend/src/index.css` and `CampusLogin.tsx`. Text colours pass 4.5:1 on white.

| Token | Value | Use |
|---|---|---|
| `ink` | `#0a2342` | Headings, body text |
| `navy` | `#123a66` | Labels, nav text |
| `muted` | `#4d6d8f` | Secondary text, helper text |
| `primary` | `#0b4d88` | Primary buttons, active nav, focus ring |
| `link` | `#0b5c9e` | Links |
| `ground` | `#f4f8fc` | Page background |
| `surface` | `#ffffff` | Cards, header, sidebar |
| `field` | `#f8fbff` | Input background |
| `border` | `#d5e4f2` | Card and divider borders |
| `border-input` | `#b9d0e6` | Input borders |
| `info-bg` / `info-border` | `#eef6ff` / `#c7def3` | Info panels |
| `error` / `error-bg` | `#b42318` / `#fef3f2` | Field errors, error alerts |
| `success` / `success-bg` | `#067647` / `#ecfdf3` | Valid code, Active status |
| `warn-text` / `warn-bg` | `#8a4b00` / `#fff4e5` | Placement Officer chip, 403 badge |
| `act-as` | `#7a2e0e` | Super Admin "acting as" banner |

| Element | Spec |
|---|---|
| Font | `'Segoe UI', -apple-system, Roboto, Helvetica, Arial, sans-serif` |
| Sizes | Page title 26px, card title 18–20px, body 15–16px, helper 13px, overline 12px uppercase |
| Radius | Cards 20–24px, inputs and buttons 10–12px, chips 999px |
| Touch targets | Buttons, nav items and inputs at least 44px high |
| Layout | Sidebar + content as a wrapping flex row; the sidebar stacks above the content on phones; wide tables scroll inside their card |

## D3. Login with demo role picker (F7)

```
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ [AG]  ALPHA GREW                 │  │ Demo accounts                    │
│       Sign in                    │  │ Pick a role to fill the form.    │
│                                  │  │ Password for all: demo123        │
│ ⓘ Recruiter portal not available │  │ ┌──────────────────────────────┐ │
│   yet. Contact the placement     │  │ │ IA  Institution Admin        │ │ ← selected
│   office of the institution that │  │ │     admin@demo.com · Admin   │ │
│   invited you.                   │  │ └──────────────────────────────┘ │
│                                  │  │ PO  Placement Officer           │
│ Email address  [______________]  │  │ ST  Staff (Faculty)             │
│ Password       [______________]  │  │ HD  Staff (HOD designation)     │
│ [          Sign in           ]   │  │ SD  Student                     │
│                                  │  │                                  │
│ New student? Create an account   │  │ Super Admin: php artisan         │
│ with your institution code       │  │ alphagrew:super-admin            │
└──────────────────────────────────┘  └──────────────────────────────────┘
```

| Part | Behaviour |
|---|---|
| Demo picker | One button per role. API mode: `admin@demo.com`, `placement@demo.com`, `staff@demo.com`, `student@demo.com` (from `CampusDemoSeeder`). Offline mode: the first local account of each role. A click fills email and password; the picked one gets a 2px `primary` border. Hidden when the build sets `VITE_HIDE_DEMO_ACCOUNTS=true` |
| Recruiter refusal | Any 403 at login (recruiter portal not open, inactive institution) shows the server's message in the `info` panel above the form, not as a red error. An expired session uses the same panel |
| Other login errors | 401/422: red alert above the form with the server's message |
| Sign-up link | Opens the sign-up screen |

## D4. Student sign-up (F6)

```
← Back to sign in
Create your student account
Use the institution code your placement office or admin gave you.

⚠ Fix the highlighted field to continue.

Full name        [Anjali Menon                         ]
Email address    [anjali@student.edu                   ]
Institution code [BRIGHT      ]   Department [Enter a valid code first ▾]
 ✕ No active institution uses this code.     (disabled until the code is valid)
Password         [••••••••                             ]  At least 6 characters.
[                     Create account                     ]

After a valid code:
 ✓ Brightnode Institute of Technology · Code DEFAULT
 ( CSE )  ( ECE )  ( ME )  ( MBA )        ← department chips, one selected
```

| Field | API key | Rules |
|---|---|---|
| Full name | `name` | Required, max 255 |
| Email | `email` | Required, unique across users and students |
| Institution code | `institutionCode` | Required; uppercased as typed; letter-spaced |
| Department | `departmentCode` | Required; must exist at that institution |
| Password | `password` | Required, min 6 |

- `POST /api/v1/auth/register`. On 422, show each `errors.<field>[0]` under its input with `aria-invalid` and `aria-describedby`, plus one summary alert at the top.
- Department list: with a public departments-by-code endpoint (open question 3 in the workflow), show the institution name and department chips once the code checks out. Without it, use a free-text department code field.
- On success, store the session and open the student portal.

## D5. Shell header and Students page (F4, F8)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [AG] ┌[BIT] Brightnode Institute of Technology┐   (Placement Officer)  Placement Office  [⎋] │
│      └      Institution code DEFAULT          ┘                        placement@demo.com      │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ PLACEMENT     │ Students                                                     │
│ PORTAL        │ 512 students in your institution. View only for placement    │
│ Dashboard     │ officers.                                                    │
│ Companies and │ Search [Name, email or reg. no.]  Department [All ▾]  Per page [25 ▾] │
│  drives       │ ┌───────────────┬──────────────┬──────┬───────────┬──────┐  │
│ Applications  │ │ Name          │ Reg. no.     │ Dept │ Batch     │ CGPA │  │
│ ▌Students     │ │ Aarav Nair    │ BIT26CSE026  │ CSE  │ 2023–2027 │ 8.42 │  │
│ Announcements │ │ …             │ …            │ …    │ …         │ …    │  │
│ Reports       │ └───────────────┴──────────────┴──────┴───────────┴──────┘  │
│ Profile       │ Showing 26–50 of 512        [Previous] 1 [2] 3 … 21 [Next]  │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

| Part | Behaviour |
|---|---|
| Institution badge | From `session.institution` (F2): initials, name, code. Hidden for Super Admin outside an institution |
| Role chip | One colour per role: Institution Admin `primary`, Placement Officer `warn`, Staff `navy`, Student `success`, Super Admin `ink` |
| Sidebar | Overline names the portal: Admin portal, Placement portal, Staff portal, Student portal. Items come from the server's permission list (F10) |
| Students table | 25 / 50 / 100 per page, "Showing 26–50 of 512", Previous / Next with "Page 2 of 21". Search and department filter reset to page 1. Today it pages the bootstrap list in the browser; it moves to `fetchStudentsPage(token, page, perPage)` and `meta.total` once `GET /students` accepts `search` and `department` |
| Writes | Create and update merge `{ student, user }` into the current page; delete removes the row and refetches the page if it empties |
| Per role | Institution Admin and HOD see Add / Edit / Delete; Placement Officer sees view only |
| Loading / empty | Skeleton rows while loading; "No students match these filters" with a Clear filters button |

## D6. Super Admin console (F9)

```
███ Acting as Brightnode Institute of Technology. Every change is recorded in the audit log. [Exit institution] ███
┌──────────────────────────────────────────────────────────────────────────────┐
│ [AG] Platform console · All institutions                       (Super Admin) │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ ▌Institutions │ Institutions                              [Add institution] │
│ Institution   │ ┌──────────────────────────┬─────────┬──────────┬───────┬────┬────────┐ │
│  admins       │ │ Institution              │ Code    │ Status   │ Admin │ St.│        │ │
│ Audit log     │ │ Brightnode Inst. of Tech.│ DEFAULT │ Active   │ admin@│ 512│ Acting │ │
│ Plans and     │ │ [Second test institution]│ [CODE]  │ Active   │ [..]  │  0 │[Act as]│ │
│  usage (Later)│ │ [Suspended institution]  │ [CODE]  │Suspended │ [..]  │  — │[Act as]│ │
│               │ └──────────────────────────┴─────────┴──────────┴───────┴────┴────────┘ │
│               │ Recent platform actions                                      │
│               │ Entered Brightnode Institute of Technology   [time] · Super Admin │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

| Part | Behaviour |
|---|---|
| Header | Dark `ink` header so the platform console never looks like an institution portal |
| Act-as banner | Full-width `act-as` bar on every screen while acting as an institution, with Exit. Uses `role="status"` |
| Institutions table | Name, code, status chip, first admin, student count, Act as. Suspended rows in `muted` text |
| Add institution | Dialog: name, code, first admin's name and email (criterion 23) |
| Audit | Latest platform actions; the full list on the Audit log page |
| Needs backend | Institution list, create, act-as and audit endpoints don't exist yet. Until they do, the console shows this note and the Super Admin keeps the admin portal |

## D7. Tenant error states (F5)

| Status | Title | Body | Action |
|---|---|---|---|
| 404 | Record not found | This student doesn't exist in {institution}, or it was removed. Check the link or search the list. | Back to students |
| 403 | You don't have access | Your role, {role}, can view students but not edit them. Ask your institution admin if you need this. User with no institution: "Your account is not linked to an institution." | Go back |
| 401 | Your session has expired | Sign in again to continue. Anything you were typing is kept on this page until you return. | Sign in again |

- The 404 never says the record exists in another institution.
- 404 and 403 replace the content area and keep the shell; **Go back** or another tab clears them.
- 401 signs the user out and shows "Your session has expired. Sign in again to continue." in the login screen's info panel. A dialog that keeps unsaved input is a later improvement.
- Each card: status badge (monospace), line icon, title, one-sentence body, one action, 44px button.

## D8. Accessibility

- Real `<label for>` on every input; errors linked with `aria-describedby`; invalid inputs get `aria-invalid="true"`.
- Active nav item and current page button use `aria-current="page"`.
- Icon-only buttons (Sign out) have `aria-label`.
- Status is never shown by colour alone: chips carry their word (Active, Suspended) and error states carry their status code.
