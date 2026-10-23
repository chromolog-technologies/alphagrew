# Alphagrew: Backend and Frontend Workflow Analysis & Frontend Roadmap

| Item | Value |
|---|---|
| Product | Alphagrew Campus Management & Placement Ecosystem |
| Organization | Chromolog Technologies |
| Document | Comprehensive Backend-Frontend Workflow Analysis & Frontend Changes Roadmap |
| Based on | Codebase commit `116a1a5`, PRD Addenda (Academics, Roles & Tenancy, Data Model) |
| Version | 1.1 Comprehensive Edition |
| Date | 20 October 2026 |
| Status | Approved for Engineering Execution |
| Audience | Frontend Engineering, Backend Engineering, QA, Product Management |

---

## 1. Executive Summary & System Baseline

An in-depth inspection of the Alphagrew codebase reveals a system operating across **three disparate implementation tiers**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React + Vite)                              │
│                                                                                  │
│   [Production V1 Screens]       [Sample Data Screens]     [In-Memory Mock UIs]   │
│   • Auth / Sign-up              • Staff Attendance        • ClassesModule        │
│   • Core Masters (Depts, etc.)  • Staff Management        • TimetableModule      │
│   • Students & Staff (V1)       • Exam Coordinator        • ExamsModule          │
│   • Marks Workflow (V1)         • Staff Placement Drives  • FeesModule           │
│   • Placement Companies (V1)    • Student Materials       • AcademicYearModule   │
│                                 • Student Notifications   • RolesPermissions     │
└──────────────┬───────────────────────────┬───────────────────────┬───────────────┘
               │                           │                       │
               ▼                           ▼                       ▼
      [Real V1 API / DB]          [Sample Controllers]     [Component State Only]
      Sanctum + TenantScope       Static PHP Arrays        useState() - Lost on
      PostgreSQL / MySQL          Header: X-Data-Source    browser refresh
```

1. **Real V1 Multi-Tenant Core API (`/api/v1/*`)**:
   - Authenticated via Laravel Sanctum and scoped by `SetTenant` middleware (`institution_id` on 20+ database tables).
   - Enforces six roles via `UserRole` enum: `super_admin`, `institution_admin`, `placement_officer`, `staff`, `student`, and `recruiter`.
   - Backed by real tables: `users`, `institutions`, `departments`, `courses`, `subjects`, `semesters`, `students`, `staff`, `companies`, `announcements`, `grade_rules`, `mark_schemes`, `mark_entries`, `semester_results`, and `exams` (read-only).
2. **Sample-Data Mockup Controllers (`/api/v1/staff/*` and `/api/v1/student/*`)**:
   - Controllers such as `App\Http\Controllers\Api\Staff\AttendanceController`, `ExamCoordinatorController`, and `PlacementController` return hardcoded static PHP arrays with `X-Data-Source: sample`. Any POST/PUT requests return `{ success: true }` without touching the database.
3. **In-Memory Component State (Admin Modules)**:
   - Admin submodules including `ClassesModule.tsx`, `TimetableModule.tsx`, `ExamsModule.tsx`, `FeesModule.tsx`, `AcademicYearModule.tsx`, and `RolesPermissionsModule.tsx` maintain hardcoded mock data in React `useState()`. They execute no HTTP requests and lose all state upon page reload.

**Purpose of this document**:
Provide an end-to-end operational blueprint that identifies every gap between the backend and frontend workflows, eliminates fake mocks and disconnected sample data, decomposes monolithic architecture, and details the exact sequence of frontend changes (Tickets WF-1 through WF-16) required for a unified, production-ready system.

---

## 2. End-to-End Workflow Analysis Matrix

The following matrix contrasts every backend capability against the current frontend implementation:

| # | Functional Domain | Backend API & Data Model | Current Frontend Implementation | Workflow Gap / Disconnect | Required Frontend Change |
|---|---|---|---|---|---|
| **1** | **Authentication & Tenancy** | `POST /auth/login`<br>`POST /auth/register`<br>`GET /auth/me`<br>`PUT /auth/profile`<br>`SetTenant` middleware | `CampusLogin.tsx`<br>`CampusSignUp.tsx`<br>`App.tsx`<br>`TenantState.tsx` | Tokens stored in two keys (`chromolog-campus-auth` and legacy `auth_token`). Recruiter login receives 403 refusal. Session lacks full institution metadata. | Unify storage to single auth provider. Display institution identity in header. Handle 403 recruiter refusal panel. |
| **2** | **Role-Based Navigation** | `CampusPermission.php`<br>`PermissionController` (`/permissions/modules`, `/permissions/all`) | Hardcoded `navByRole` in `CampusWorkspace.tsx` (6,869 lines) | Client hand-copies role permissions in `campusTypes.ts`. Nav is rendered from static permissions rather than backend token claims. | Drive sidebar and routing dynamically from `user.permissions` provided by `/auth/me`. |
| **3** | **Departments & Designations** | `/departments` (CRUD + stats)<br>`/designations` (CRUD + permissions) | `DepartmentsModule.tsx`<br>`DesignationsModule.tsx`<br>`CampusWorkspace.tsx` | Designations properly use `isInstitutionStaffRole`. Departments CRUD works via `campusApi.ts`. | Add department intake and HOD selection dropdowns hooked to `/departments/list/hod-options`. |
| **4** | **Courses, Subjects & Semesters** | `/courses`<br>`/subjects`<br>`/semesters`<br>Filtered lists in `apiClient.ts` | `CoursesModule.tsx`<br>`SubjectsModule.tsx`<br>`CampusWorkspace.tsx` | Works via `apiClient.ts` (`courseApi`, `subjectApi`, `semesterApi`). Good integration. | Standardize error handling using `ApiError` to catch 422 validation messages cleanly. |
| **5** | **Academic Years** | Backed by `academic_years` table; listed via `/semesters/list/academic-years` | `AcademicYearModule.tsx` | **100% In-memory state.** Add/delete operates only on local React array. No direct CRUD endpoint on backend. | Implement backend CRUD endpoint `/academic-years`. Connect frontend module with loading/error states. |
| **6** | **Classes & Batches** | `classes`, `class_student` tables; `ClassModel.php` with relations to course, semester, hod | `ClassesModule.tsx` | **100% In-memory state.** Hardcoded array of classes. No student assignment workflow. | Create `classesApi.ts`. Build batch selector, semester link, and student assignment drawer. |
| **7** | **Timetable Management** | `timetables` table; `Timetable.php` (day, start_time, end_time, room, subject, faculty) | `TimetableModule.tsx` (Admin)<br>`StudentTimetableView.tsx` (Student) | Admin timetable is in-memory. Student timetable reads real `/student/timetable` but is **not linked in student sidebar nav**. | Connect Admin module to real timetable CRUD. Add timetable tab to Student navigation. |
| **8** | **Attendance Marking & Tracking** | Real `/attendance/*` (mark, approve, subject/student reports).<br>Sample `/staff/attendance/*` | `AttendanceMarking.tsx`<br>`AttendanceModule.tsx`<br>`StudentAttendanceView.tsx` | Staff screen calls **sample** controller (`/staff/attendance/students`). Real `/attendance/*` controller has SQL bugs (`classes.subject_id`, `roll_number`). | Fix backend queries. Rewire `AttendanceMarking.tsx` to real `/attendance/mark` and `/attendance/subject/{id}/students`. |
| **9** | **Exam Scheduling** | `exams`, `exam_types` tables. `GET /exams` exists. **POST /exams missing in backend.** | `ExamsModule.tsx` (Admin)<br>`ExamCoordinatorModule.tsx` (Staff) | `ExamsModule` is in-memory. `ExamCoordinatorModule` uses sample data. Student nav requires `departments.create` so students cannot see exams! | Fix student permission to `exams.view`. Implement `POST /exams` in backend and wire `ExamsModule`. |
| **10**| **Marks & Results Pipeline** | `/grade-rules`<br>`/mark-schemes`<br>`/mark-entries`<br>`/mark-review`<br>`/result-publishing`<br>`/student/results` | `MarksWorkflowModule.tsx`<br>`MarksSetupPanel.tsx`<br>`MarksEntryPanel.tsx`<br>`MarksReviewPanel.tsx`<br>`ResultPublishingPanel.tsx`<br>`StudentResultsView.tsx` | Backend pipeline is fully functional with tenant isolation. Frontend components built in `components/marks/`. Connected in `CampusWorkspace.tsx`. | Verify end-to-end integration against seeded exams. Retire old disconnected `StudentMarksView.tsx`. |
| **11**| **Placement & Drives** | Real `/companies` (CRUD + apply).<br>Sample `/staff/placement/drives` | `PlacementOfficerModule.tsx`<br>`TPODashboard.tsx`<br>`CampusWorkspace.tsx` | Disconnect: Admin/Placement Officer uses `renderPlacementTab` for real companies, but `PlacementOfficerModule` is orphaned and uses sample drives. | Unify placement: wire `CompanyController` to track drive dates, packages, student eligibility checks, and applications. |
| **12**| **Fees & Dues Management** | `fee_structures`, `student_fees` tables exist. Hand-edited `students.fee_status`. | `FeesModule.tsx` | **100% In-memory state.** Hand-edited dues in student profile instead of derived fee records. | Build backend Fee endpoints. Wire `FeesModule` to real structure and dues tracking. |
| **13**| **Student Self-Service** | `/student/materials`<br>`/student/assignments`<br>`/student/notifications` (Sample) | `StudentAssignmentsMaterials.tsx`<br>`StudentNotifications.tsx` | Components exist in `components/student/` but are **orphaned from student navigation**. Read sample data only. | Add assignments and notifications to Student nav. Transition backend to real storage when available. |
| **14**| **Super Admin Console** | `UserRole::SUPER_ADMIN`. Seeded via CLI. Bypasses tenant scope in backend. | `CampusWorkspace.tsx` | Super Admin lands in the standard institution-admin dashboard titled "Platform overview". No institution list or switch-tenant UI. | Build dedicated Super Admin Console: institution onboarding, active tenant switch banner, audit logs. |

---

## 3. Detailed Role & Portal Workflow Mapping

Alphagrew defines six distinct roles. The frontend must guide each role through its designated workflow without permission leaks or missing interfaces:

```
                  ┌───────────────────────────────┐
                  │       User Authentication     │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
   [super_admin]        [institution_admin]     [placement_officer]
   • Platform Console   • Institutional Setup   • Company Registry
   • Institution Mgmt   • Academic Config       • Placement Drives
   • Tenant Switcher    • Staff / Student CRUD  • Student Eligibility
   • Audit Log View     • Result Publishing     • Drive Analytics
         │                       │                       │
         ├───────────────────────┼───────────────────────┤
         │                       │                       │
         ▼                       ▼                       ▼
      [staff]                [student]              [recruiter]
   • Department HOD     • My Results (GPA)      • (Refusal Notice)
   • Faculty Allocation • Subject Attendance    • "Portal not available
   • Attendance Entry   • Class Timetable       • Contact Placement
   • Marks Draft/Submit • Placement Applications• Office" Info Panel
```

### 3.1. Super Admin Portal
* **Current State**: Redirected to `CampusWorkspace` with `campusPortalLabels.super_admin` ("Platform overview"). Renders standard institution admin dashboard.
* **Target Workflow**:
  1. Login triggers check `user.role === 'super_admin'`.
  2. Redirects to **Platform Management Console**.
  3. Displays global metrics: Total Institutions, Total Active Students, Global System Health.
  4. Features an **Institutions Directory** with create/suspend actions.
  5. Provides an **"Act as Institution"** action that sets a visible persistent top-bar banner (`Viewing as St. Joseph's Institute`) and scopes API requests to that institution ID.
  6. Global System Audit Log inspector.

### 3.2. Institution Admin Portal
* **Current State**: Uses full admin navigation. Manages Courses, Departments, Designations, Students, Staff via real API. Classes, Timetable, Exams, Fees are in-memory mocks.
* **Target Workflow**:
  1. Academic Setup: Academic Years → Semesters → Departments → Courses → Subjects → Grade Rules & Mark Schemes.
  2. Structure & Enrollment: Classes/Batches → Student Onboarding (single or bulk CSV) → Staff Designations & Permissions.
  3. Operational Oversight: Attendance verification reports, exam scheduling, result approval & final semester publishing.
  4. Fee structure definition and dues tracking.

### 3.3. Placement Officer Portal
* **Current State**: Nav item `placement` renders internal `renderPlacementTab()` for `/companies`. Separate `PlacementOfficerModule.tsx` is orphaned.
* **Target Workflow**:
  1. Company Onboarding: Register visiting companies, job profiles, compensation packages, and drive dates.
  2. Eligibility Rule Definition: Cutoffs based on published semester CGPA (`CGPA >= 7.0`) and active backlogs (`backlogs == 0`).
  3. Drive Execution: Track student applications, shortlist applicants, record round outcomes (Aptitude, Tech, HR).
  4. Analytics: Placement percentage by department, package distribution charts, offer letter issuance.

### 3.4. Staff / Faculty Portal
* **Current State**: Nav includes Dashboard, Students, Departments, Attendance, Exams, Marks, Placement, Announcements, Reports. Attendance and Staff Management point to fake sample data.
* **Target Workflow**:
  1. Department Context: Staff designated as HOD access Department Overview, Faculty Workload, and Class Assignments.
  2. Attendance Marking: Select allocated subject → Fetch enrolled student sheet → Mark Present/Absent/Late → Save & Submit for HOD approval.
  3. Marks Entry: Select allocated exam & subject → Load class student sheet → Enter Internal/External marks → Auto-calculate totals against mark scheme → Save Draft → Submit for verification.
  4. Marks Verification (HOD/Exam Coordinator): Review submitted mark sheets → Verify → Approve or Reject with mandatory remark.

### 3.5. Student Portal
* **Current State**: Nav includes Dashboard, Attendance, Marks, Placement, Announcements, Profile. Exams tab is broken due to permission misconfiguration. Timetable, Assignments, and Notifications are missing from the navigation menu.
* **Target Workflow**:
  1. Academic Progress: Real-time Attendance percentage by subject with low-attendance warnings (<75%).
  2. Timetable: Weekly schedule display showing day, slot, subject, faculty, and room.
  3. Results: Published semester mark sheets, credit summaries, SGPA/CGPA cards, and revaluation requests.
  4. Placement: View eligible company drives, apply with one click using the built-in profile resume, and track application stage.
  5. Learning Materials & Notifications: Course notes, assignments with file submission, and institutional notices.

### 3.6. Recruiter Portal
* **Current State**: Recruiter accounts exist in the database, but login is rejected by the backend with a 403 error.
* **Target Workflow**:
  1. User attempts login with recruiter credentials.
  2. Backend responds with 403: `"The recruiter portal is not available yet. Contact the placement office of the institution that invited you."`
  3. Frontend catches this error and renders an informative branded notice with contact links, rather than a generic error toast.

---

## 4. Key Architectural Disconnects & Gaps

### 4.1. Authentication & Token Management Fragmentation
* `apiClient.ts` reads `localStorage.getItem('chromolog-campus-auth')` and parses `{ token: string }`.
* Legacy components (`AttendanceMarking.tsx`, `StudentAttendanceView.tsx`, `HODStaffManagement.tsx`) call `localStorage.getItem('auth_token')`.
* `App.tsx` manually syncs `auth_token` on line 268 to bridge this gap.
* **Solution**: Standardize on `apiClient.ts` as the single transport layer with an automated request interceptor.

### 4.2. Error Handling & Form Validation
* `request()` in `campusApi.ts` and `apiCall()` in `apiClient.ts` now throw `ApiError` with `status` and `errors`.
* However, forms across `CoursesModule`, `SubjectsModule`, `DepartmentsModule`, and student creation forms still catch generic errors (`error.message`) and fail to render inline 422 field errors under specific inputs.
* **Solution**: Integrate an `inlineFieldError(error, fieldName)` helper across all form dialogs.

### 4.3. Navigation & Permission Drift
* In `frontend/src/campusTypes.ts`, `campusRolePermissions` is manually maintained.
* Backend `CampusPermission.php` contains the authoritative list. If backend permissions change, frontend navigation drifts.
* In `CampusWorkspace.tsx`, nav definitions use hardcoded static permission names (e.g. `departments.create` on the `exams` nav item), blocking students from viewing exams.
* **Solution**: Sidebar navigation must dynamically check `user.permissions.includes(...)` populated by the session payload.

### 4.4. The Monolithic `CampusWorkspace.tsx`
* `CampusWorkspace.tsx` has grown to **6,869 lines**, containing inline render functions for Dashboard, Staff, Students, Placement, Reports, and Profile tabs alongside shell logic.
* Meanwhile, modular files exist under `components/admin/`, `components/staff/`, and `components/student/`, but are either duplicated or orphaned.
* **Solution**: Decompose `CampusWorkspace.tsx` into a lean shell component with modular tab router delegates.

---

## 5. Target Frontend Architecture & Directory Restructuring

To resolve the 6,869-line monolithic `CampusWorkspace.tsx` and maintain clean domain boundaries, the frontend codebase is re-architected into modular domain packages:

```
frontend/src/
├── api/
│   ├── apiClient.ts          # Core authenticated HTTP transport
│   ├── apiError.ts           # Status-aware ApiError class & fieldError()
│   ├── authApi.ts            # Login, signup, me, profile, reset
│   ├── academicApi.ts        # Courses, subjects, semesters, academic years
│   ├── attendanceApi.ts      # Real /v1/attendance endpoints
│   ├── classesApi.ts         # Classes, batches, student class assignment
│   ├── examsApi.ts           # Exam scheduling, exam types
│   ├── feesApi.ts            # Fee structures, student dues
│   ├── marksApi.ts           # Grade rules, schemes, entries, review, publishing
│   ├── placementApi.ts       # Companies, drives, student applications
│   ├── superAdminApi.ts      # Platform metrics, institutions, audit logs
│   └── timetableApi.ts       # Weekly slot scheduling & student timetable
├── components/
│   ├── admin/                # Institutional admin modules
│   │   ├── AcademicYearModule.tsx
│   │   ├── ClassesModule.tsx
│   │   ├── CoursesModule.tsx
│   │   ├── DepartmentsModule.tsx
│   │   ├── DesignationsModule.tsx
│   │   ├── FeesModule.tsx
│   │   ├── RolesPermissionsModule.tsx
│   │   ├── SubjectsModule.tsx
│   │   └── SystemSettingsModule.tsx
│   ├── attendance/           # Attendance marking and reporting
│   │   ├── AttendanceMarkingPanel.tsx
│   │   ├── AttendanceApprovalPanel.tsx
│   │   └── AttendanceReportPanel.tsx
│   ├── auth/                 # Authentication & onboarding
│   │   ├── CampusLogin.tsx
│   │   ├── CampusSignUp.tsx
│   │   ├── RecruiterNoticePanel.tsx
│   │   └── ProtectedRoute.tsx
│   ├── layout/               # Lean workspace shell
│   │   ├── WorkspaceShell.tsx
│   │   ├── HeaderTenantBadge.tsx
│   │   ├── DynamicSidebar.tsx
│   │   └── TabRouter.tsx
│   ├── marks/                # Production marks pipeline (V1)
│   │   ├── MarksWorkflowModule.tsx
│   │   ├── MarksSetupPanel.tsx
│   │   ├── MarksEntryPanel.tsx
│   │   ├── MarksReviewPanel.tsx
│   │   ├── ResultPublishingPanel.tsx
│   │   └── StudentResultsView.tsx
│   ├── placement/            # Corporate relations & drives
│   │   ├── CompanyRegistryPanel.tsx
│   │   ├── PlacementDrivesPanel.tsx
│   │   ├── ApplicationReviewDrawer.tsx
│   │   └── StudentApplyModal.tsx
│   ├── shared/               # Shared UI atoms & state views
│   │   ├── TenantState.tsx   # 401, 403, 404 tenant error boundary
│   │   ├── PrototypeNotice.tsx
│   │   └── FormFieldError.tsx
│   ├── student/              # Student self-service
│   │   ├── StudentDashboard.tsx
│   │   ├── StudentAttendanceView.tsx
│   │   ├── StudentTimetableView.tsx
│   │   ├── StudentAssignmentsMaterials.tsx
│   │   └── StudentNotifications.tsx
│   └── superadmin/           # Super Admin Console
│       ├── SuperAdminDashboard.tsx
│       ├── InstitutionDirectory.tsx
│       ├── ImpersonationBanner.tsx
│       └── PlatformAuditLog.tsx
├── hooks/
│   ├── useApi.ts             # Generic data fetching with loading & error
│   ├── useFormValidation.ts  # 422 inline field error state management
│   ├── usePermissions.ts     # Dynamic RBAC check helper `can(permission)`
│   └── useTenantContext.ts   # Active institution identity & impersonation
└── campusTypes.ts            # Canonical domain types & interfaces
```

---

## 6. Frontend TypeScript Interfaces & DTO Contracts

To support real backend workflows without untyped `any` calls, the following interfaces are standardized:

### 6.1. Attendance Domain
```typescript
export interface AttendanceStudentRow {
  studentId: number;
  registrationNumber: string;
  name: string;
  status: 'present' | 'absent' | 'leave' | 'late' | null;
  remarks?: string;
}

export interface MarkAttendancePayload {
  subject_id: number;
  attendance_date: string;
  remarks?: string;
  attendance_data: {
    student_id: number;
    status: 'present' | 'absent' | 'leave' | 'late';
  }[];
}

export interface SubjectAttendanceSummary {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  totalSessions: number;
  attendedSessions: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical'; // critical if < 75%
}
```

### 6.2. Timetable Domain
```typescript
export interface TimetableSlotDTO {
  id: number;
  classId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  facultyId: number;
  facultyName: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  startTime: string; // '09:00'
  endTime: string;   // '10:30'
  room: string;
  sessionType: 'lecture' | 'lab' | 'tutorial';
}
```

### 6.3. Exam & Result Domain
```typescript
export interface ExamDTO {
  id: number;
  semesterId: number;
  subjectId: number;
  subjectName: string;
  name: string; // 'Mid Semester 1'
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}

export interface SemesterResultSummary {
  semesterId: number;
  semesterNumber: number;
  academicYear: string;
  sgpa: number;
  cgpa: number;
  totalCredits: number;
  creditsEarned: number;
  backlogs: number;
  isPublished: boolean;
  publishedAt: string;
  subjects: {
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    internalMarks: number;
    externalMarks: number;
    totalMarks: number;
    grade: string;
    gradePoints: number;
    passed: boolean;
  }[];
}
```

### 6.4. Super Admin Domain
```typescript
export interface SuperAdminInstitutionDTO {
  id: number;
  name: string;
  code: string;
  slug: string;
  adminEmail: string;
  studentCount: number;
  staffCount: number;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
}

export interface PlatformAuditLogDTO {
  id: number;
  institutionId?: number;
  institutionName?: string;
  userName: string;
  userRole: string;
  action: string;
  targetType: string;
  ipAddress: string;
  timestamp: string;
}
```

---

## 7. Actionable Frontend Changes Roadmap (Tickets WF-1 to WF-16)

The roadmap is organized into five sequential phases:

```
Stage 1: Transport & Nav    Stage 2: Academics & Marks   Stage 3: Attendance & Exams   Stage 4: Ops & Placement   Stage 5: Platform
WF-1 Unified API Client  ─► WF-4 Activate Marks Pipeline ─► WF-7 Real Attendance API  ─► WF-10 Unify Placement  ─► WF-14 Super Admin Console
WF-2 Dynamic RBAC Nav    ─► WF-5 Student Results View    ─► WF-8 Timetable Sync       ─► WF-11 Real Fees Module  ─► WF-15 Student Self-Service
WF-3 Tenant Context Header─► WF-6 Inline 422 Field Errors─► WF-9 Exam Scheduler      ─► WF-12 Classes & Batches ─► WF-16 Server Pagination
                                                                                      ─► WF-13 Academic Years
```

### Phase 1: Transport, Navigation & Tenant Identity (Weeks 1–2)

#### Ticket WF-1: Unified API Transport Layer & Auth Token Storage
* **Objective**: Remove duplicate token logic and unify all HTTP calls through `apiClient.ts`.
* **Changes**:
  1. Update `apiClient.ts` to export typed methods (`get`, `post`, `put`, `del`, `upload`).
  2. Remove legacy `localStorage.getItem('auth_token')` references across all files (`AttendanceMarking`, `StudentAttendanceView`, `StudentMarksView`, `HODStaffManagement`). Standardize on `chromolog-campus-auth`.
  3. Ensure `apiErrorFromResponse` correctly maps validation arrays (`errors: Record<string, string[]>`) and attaches HTTP status codes.
* **Done When**: No code reads `'auth_token'`. All requests go through the unified client with automatic token attachment.

#### Ticket WF-2: Dynamic Permission-Driven Sidebar Navigation
* **Objective**: Eliminate static `baseNavByRole` arrays and dynamically render navigation based on backend permissions.
* **Changes**:
  1. Refactor `CampusWorkspace.tsx` nav generator: filter navigation items using `user.permissions.includes(item.permission)`.
  2. Fix student `exams` item permission: change from `departments.create` to `exams.view` (or `marks.view`).
  3. Add missing student navigation items: `Timetable` (`timetable.view`), `Assignments` (`assignments.view`), `Notifications` (`notifications.view`).
  4. Prune orphaned tab routes in `CampusWorkspace.tsx` (`exam_coordinator`, `hod_staff_management`, `department_overview`) and integrate them under cohesive parent modules with permission gates.
* **Done When**: Each role sees exactly the tabs they are permitted to view. No tabs are hidden due to incorrect permission keys.

#### Ticket WF-3: Tenant Identity Context & Institution Header Display
* **Objective**: Display active institution branding and code in the workspace header.
* **Changes**:
  1. When backend Ticket F2 lands (`institution: { id, name, code, logoUrl }` in login response), store and bind it to the header tenant badge.
  2. Display the institution logo/badge and institution code in the header (desktop) and mobile drawer.
  3. For Super Admin, render an accent badge: `System Administration` when outside a tenant, or `Acting as: [Institution Name] (Exit)` when impersonating.
* **Done When**: Header displays the user's institution name and code in both desktop and mobile views.

---

### Phase 2: Grading, Marks & Form Validation (Weeks 3–4)

#### Ticket WF-4: Full Activation of Marks & Results Workflow Module
* **Objective**: Replace legacy hardcoded `MarksModule.tsx` with the new four-stage `MarksWorkflowModule.tsx` for all administrative and faculty roles.
* **Changes**:
  1. Route `case 'marks':` in `CampusWorkspace.tsx` to `MarksWorkflowModule` for non-student roles.
  2. Implement role-appropriate defaults:
     - Admin / Exam Coordinator opens on **Step 1 (Set up)** or **Step 4 (Publish)**.
     - Faculty opens on **Step 2 (Enter marks)**.
     - HOD opens on **Step 3 (Review)**.
  3. Ensure mark submission handles draft saving, automatic total calculations, and validation against maximum marks.
* **Done When**: Staff can enter marks, submit them, HOD can verify/approve/reject, and Admin can publish results to lock them.

#### Ticket WF-5: Student Semester Results View Integration
* **Objective**: Replace old `StudentMarksView.tsx` with `StudentResultsView.tsx` linked to published semester results.
* **Changes**:
  1. In `CampusWorkspace.tsx`, ensure `case 'marks'` renders `StudentResultsView` for `user.role === 'student'`.
  2. Display Cumulative GPA (CGPA), semester-by-semester SGPA, credits earned, and per-subject internal/external breakdown.
  3. Provide an empty state explaining: "No results published for your current semester yet. Contact your examination cell."
  4. Add a "Request Revaluation" modal placeholder wired to `POST /student/revaluation` when enabled.
* **Done When**: Students see their official published grades, SGPA/CGPA cards, and subject details.

#### Ticket WF-6: Inline 422 Validation Error Binding Across Forms
* **Objective**: Replace generic alert messages with inline field error messages on all administrative forms.
* **Changes**:
  1. Create a reusable hook `useFormValidation<T>()` utilizing `ApiError.fieldError(fieldName)`.
  2. Update form modals in `CoursesModule`, `SubjectsModule`, `DepartmentsModule`, and Student creation forms to display red inline error text beneath invalid inputs.
  3. Clear field errors automatically on input `onChange`.
* **Done When**: Submitting duplicate codes or missing required fields renders red validation text directly under the responsible input.

---

### Phase 3: Attendance, Exams & Timetable (Weeks 5–6)

#### Ticket WF-7: Real Attendance Marking & Approval Workflow Integration
* **Objective**: Migrate faculty and HOD attendance marking from sample data to the real `/v1/attendance` API.
* **Changes**:
  1. In `api/campusApi.ts`, implement `attendanceApi`:
     - `getStudentsForSubject(subjectId)` → `GET /attendance/subject/{subjectId}/students`
     - `markAttendance(payload)` → `POST /attendance/mark`
     - `approveAttendance(payload)` → `POST /attendance/approve`
     - `getSubjectReport(subjectId)` → `GET /attendance/subject/{subjectId}/report`
  2. Update `AttendanceMarking.tsx`:
     - Select semester and subject from the user's allocated subjects.
     - Load enrolled students from real API.
     - Mark status: Present, Absent, Late, Leave.
     - Save attendance records and provide clear feedback.
  3. Update `StudentAttendanceView.tsx` to read real records from `/student/attendance` and `/student/attendance/detailed`.
* **Done When**: Marking attendance records updates the database. Students immediately see updated percentages.

#### Ticket WF-8: Timetable Management & Student Schedule Wiring
* **Objective**: Convert `TimetableModule.tsx` and `StudentTimetableView.tsx` from in-memory mocks to real API calls.
* **Changes**:
  1. Build `timetableApi.ts`:
     - `list(params)` → `GET /timetables`
     - `create(slot)` → `POST /timetables`
     - `update(id, slot)` → `PUT /timetables/{id}`
     - `delete(id)` → `DELETE /timetables/{id}`
     - `getStudentTimetable()` → `GET /student/timetable`
  2. In `TimetableModule.tsx`, replace `useState(timeSlots)` with `timetableApi` calls. Add validation to prevent overlapping slots for the same class/room.
  3. In `StudentTimetableView.tsx`, display the student's real weekly schedule broken down by day of the week.
* **Done When**: Timetable slots created by an admin appear in the student's personal timetable view.

#### Ticket WF-9: Exam Scheduling & Exam Types Console
* **Objective**: Wire `ExamsModule.tsx` to real backend endpoints.
* **Changes**:
  1. Create `examsApi.ts`:
     - `list(params)` → `GET /exams` (filtering by semester/subject)
     - `create(exam)` → `POST /exams` (backend prerequisite)
     - `listTypes()` → `GET /exam-types`
  2. Update `ExamsModule.tsx` to fetch existing exams and allow scheduling with date, start time, end time, max marks, and room.
  3. Ensure scheduled exams populate the dropdown in the Marks Entry screen (`MarksEntryPanel.tsx`).
* **Done When**: Creating an exam in `ExamsModule` enables faculty to select that exam for mark entry in `MarksWorkflowModule`.

---

### Phase 4: Classes, Fees, Master Data & Placement (Weeks 7–8)

#### Ticket WF-10: Placement Officer & Corporate Relations Unification
* **Objective**: Retire disconnected sample data controllers and connect the Placement Officer interface to real company and application records.
* **Changes**:
  1. Refactor placement tabs in `CampusWorkspace.tsx`:
     - **Companies**: Register visiting corporate partners, HR contact info, and industry tags (`/v1/companies`).
     - **Job Drives**: Manage drive dates, salary packages, and minimum CGPA criteria.
     - **Applications**: View applied students with CGPA, backlog counts, and resume links (`/v1/companies/{id}/applications`).
     - **Results**: Record selections, offers, and package metrics.
  2. For students: In `renderPlacementTab()`, display eligible drives based on student CGPA and allow one-click application (`POST /companies/{id}/apply`).
* **Done When**: Placement Officer creates a drive, eligible students apply, and the officer can review applicants and record offers.

#### Ticket WF-11: Institutional Fees & Student Dues Workflow
* **Objective**: Replace in-memory `FeesModule.tsx` with a fee structure and student dues tracking interface.
* **Changes**:
  1. Build `feesApi.ts` connecting to `/v1/fee-structures` and `/v1/student-fees`.
  2. Admin interface: Define fee structure per academic year, course, and semester (Tuition, Lab, Library, Exam).
  3. Student interface: Display fee breakdown, total dues, paid amounts, payment history, and receipt downloads.
* **Done When**: Fee structures calculate dues automatically per student. Students can see their payment status.

#### Ticket WF-12: Classes & Student Batch Allocation Console
* **Objective**: Replace in-memory `ClassesModule.tsx` with real class and batch management.
* **Changes**:
  1. Connect `ClassesModule.tsx` to `GET/POST/PUT/DELETE /classes`.
  2. Implement class creation modal: Course, Semester, Section name, Batch year, and Room.
  3. Implement **Student Allocation Drawer**: Select students from the department and assign them to the class.
* **Done When**: Classes are persisted in the database and linked students populate the attendance mark sheet.

#### Ticket WF-13: Academic Years & Term Setup Integration
* **Objective**: Replace mock `AcademicYearModule.tsx` with real academic year administration.
* **Changes**:
  1. Connect to `/v1/academic-years` (backend prerequisite) with fallback to `/semesters/list/academic-years`.
  2. Implement Create Academic Year modal: Year label (e.g. `2026-2027`), Start Date, End Date, and Active status toggle.
  3. Automatically filter courses, semesters, and fees based on the selected active academic year.
* **Done When**: Active academic year selection persists across sessions and scopes semester filters.

---

### Phase 5: Platform Governance & Multi-Tenancy (Weeks 9–10)

#### Ticket WF-14: Super Admin Multi-Tenant Console
* **Objective**: Build the dedicated Super Admin Management Console.
* **Changes**:
  1. When signed in as `super_admin`, replace institutional navigation with the **Super Admin Console**:
     - **Overview**: System metrics (total tenants, user volume, storage, server status).
     - **Institutions**: Tenant list with Code, Admin email, Plan, Status, and "Onboard Institution" action.
     - **Act As Tenant**: Dropdown allowing Super Admin to inspect any institution. Displays a high-visibility orange banner: `Acting as: Cambridge Institute of Technology (Exit)`.
     - **Audit Logs**: Filterable log of cross-tenant actions, logins, and permission changes.
* **Done When**: Super Admin can manage all institutions and view platform-wide audit logs.

#### Ticket WF-15: Student Self-Service Suite (Materials & Notifications)
* **Objective**: Complete student self-service modules and connect them to real APIs.
* **Changes**:
  1. Connect `StudentAssignmentsMaterials.tsx` to real material uploads and assignment submissions.
  2. Connect `StudentNotifications.tsx` to real notifications API with mark-as-read, delete, and preference controls.
  3. Add clear download links for syllabus PDFs and course materials.
* **Done When**: Students can view notices, download class notes, and upload assignment files.

#### Ticket WF-16: Server-Side Pagination, Filtering & Search
* **Objective**: Replace client-side array paging with server-side pagination for high-volume datasets.
* **Changes**:
  1. Update `Students` tab: Utilize `fetchStudentsPage(page, perPage, search, department)`.
  2. Add debounce (300ms) to search inputs.
  3. Apply server-side pagination to `Staff`, `Attendance Records`, and `Audit Logs`.
* **Done When**: Datasets with 5,000+ records load smoothly in 25/50/100 item pages without browser lag.

---

## 8. Backend Prerequisites & Blocking Defects

For the frontend roadmap to be executed smoothly, the following backend defects and missing endpoints must be addressed:

| # | Domain | File / Location | Defect / Missing Capability | Impact on Frontend |
|---|---|---|---|---|
| **B1** | **Attendance** | `AttendanceController.php:165` | Queries `ClassModel::where('subject_id', $subjectId)`. `classes` table does not have `subject_id`. | `GET /attendance/subject/{id}/students` throws SQL error (500). Blocks Ticket WF-7. |
| **B2** | **Attendance** | `AttendanceController.php:180` | Queries `$student->roll_number`. Table column is `registration_number`. | Attendance mark sheet throws exception (500). Blocks Ticket WF-7. |
| **B3** | **Attendance** | `AttendanceController.php:31` | Checks `$user->hasRole('faculty')`. The enum value is `staff`. | Faculty cannot view attendance. Blocks Ticket WF-7. |
| **B4** | **Exams** | `routes/api.php`, `ExamController.php` | `POST /exams` does not exist. Only read-only `GET /exams` is defined. | Exams cannot be created from the UI. Blocks Ticket WF-9. |
| **B5** | **Session** | `AuthController.php:me()` | Login response returns `institutionId`, but lacks `institution: { id, name, code, logoUrl }`. | Frontend header cannot display tenant name dynamically. Blocks Ticket WF-3. |
| **B6** | **Academic Years**| `routes/api.php` | No direct CRUD for `academic_years`. Only read-only semester list exists. | Blocks real `AcademicYearModule` (Ticket WF-13). |
| **B7** | **Fees** | `routes/api.php` | Tables `fee_structures` and `student_fees` exist, but no API routes are registered. | Blocks real `FeesModule` (Ticket WF-11). |
| **B8** | **Classes** | `routes/api.php` | No V1 API routes for `classes` and `class_student` assignment. | Blocks real `ClassesModule` (Ticket WF-12). |

---

## 9. Verification & Quality Assurance Strategy

### 9.1. Automated Verification Checks
Every frontend pull request must pass:
1. `npm run lint` or ESLint zero-warning checks.
2. `npx tsc --noEmit`: Strict TypeScript typechecking with no implicit `any`.
3. `npm run build`: Production Vite bundling.

### 9.2. Multi-Tenant Isolation Smoke Test
For any ticket interacting with institution data:
1. Sign in as Admin from Institution A (`admin@demo.com`).
2. Create or modify a record (e.g. Student, Course, Subject, Mark).
3. Sign in as Admin from Institution B (`admin_b@demo.com`).
4. **Assert**: Institution A's record is completely invisible.
5. Attempting to access Institution A's record directly via URL must trigger `TenantState.tsx` displaying: **404 Record Not Found**.

### 9.3. Offline Demo Mode Fallback
* When `VITE_API_BASE_URL` is omitted, the frontend must run in offline demo mode using `campusDemoData.ts`.
* Any screen requiring the live Laravel backend (Marks Workflow, Sign-up) must display `Notice`:
  `"This workflow runs on the Laravel API. Set VITE_API_BASE_URL and sign in with a demo account."`

---

## 10. Implementation Schedule & Owners

| Phase | Tickets | Weeks | Lead Frontend | Supporting Backend | Milestone Review |
|---|---|---|---|---|---|
| **Phase 1: Transport & Nav** | WF-1, WF-2, WF-3 | Weeks 1–2 | Jijin | Neethu | Unified API client & dynamic nav review |
| **Phase 2: Marks & Grading** | WF-4, WF-5, WF-6 | Weeks 3–4 | Jijin + Akhila | Neethu | End-to-end marks draft → publish demo |
| **Phase 3: Attendance & Exams**| WF-7, WF-8, WF-9 | Weeks 5–6 | Jijin | Neethu (Backend fixes B1-B4) | Attendance & Timetable live sync |
| **Phase 4: Operations & Fees** | WF-10, WF-11, WF-12, WF-13 | Weeks 7–8 | Jijin + Akhila | Neethu (Backend fixes B6-B8) | Placement & Class assignment demo |
| **Phase 5: Platform Governance**| WF-14, WF-15, WF-16 | Weeks 9–10 | Jijin + Akhila | Neethu | Super Admin console & Production signoff |
