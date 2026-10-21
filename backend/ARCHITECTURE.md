# Backend architecture

Laravel 12 API for Alphagrew. This file explains where code goes in `app/` and how a request moves through the layers. The Students module is the reference implementation; copy its shape for new modules.

## Request flow

```
routes/api.php            URL + permission middleware (permission:module.action,sanctum)
  → Http/Requests         FormRequest: authorize() (who may do this) + rules() (input shape)
  → Http/Controllers      thin: picks the Action/Repository, shapes the HTTP response
      → Actions           one business operation that writes (transaction, several models)
      → Repositories      reusable reads, including "who may see which rows"
      → Policies          record-level rules (e.g. staff only touch their own department)
  → Http/Resources        model → JSON field names the frontend expects
```

Example, `PUT /api/v1/students/{student}`:

1. Route middleware checks `students.create`.
2. `UpdateStudentRequest::authorize()` asks `StudentPolicy::manage()` (staff limited to their department), then validates.
3. `StudentController::update()` turns the input into a `StudentData` DTO and calls `UpdateStudentAction`.
4. The response is `StudentResource` plus the linked account.

## Folders

| Folder | Holds | In this codebase |
|---|---|---|
| `Actions/` | One write operation per class with an `execute()` method. Use when a write touches several models, needs a transaction, or is called from more than one place. | `Students/CreateStudentAction` (admin create **and** self-registration), `UpdateStudentAction`, `DeleteStudentAction`, `UpdateStudentResumeAction`, `Staff/SaveStaffMemberAction`, `Staff/DeleteStaffMemberAction`, `Placement/ApplyToCompanyAction`, `Marks/*` (save draft, submit, verify, approve, reject, publish, unlock), `Interviews/*` (create, start, answer turn, analyze turn, finish), `Resumes/*` (upload, delete, sync skills) |
| `DTOs/` | Typed, read-only input passed from a FormRequest to an Action, so Actions never read raw request arrays. | `StudentData`, `StaffMemberData` |
| `Enums/` | Fixed sets of values. | `UserRole` (the six roles; `users.role` stores its value), `MarkStatus` (the marks lifecycle and its allowed transitions) |
| `Events/`, `Listeners/` | Things that happened and reactions to them, e.g. `ResultsPublished` → recalculate CGPA. | `StudentResultsChanged` → `QueueAcademicSummaryRecalculation` (queues `Jobs/RecalculateAcademicSummary` per student); the AI Interview Journey pipeline in `QueueAiJourneyJobs` (`ResumeUploaded` → parse → `ResumeParsed` → analyse; `InterviewFinished` → evaluate → `InterviewEvaluated` → skill gap + readiness) |
| `Exceptions/` | Domain exceptions. `BusinessRuleException` returns `{"message": ...}` with 403/422 when valid input breaks a rule. | `BusinessRuleException` |
| `Helpers/` | Plain functions with no better home. Prefer a class in `Support/` first. | Empty |
| `Http/Controllers/` | Thin controllers, one per resource. No validation arrays and no multi-step writes. | `Api/V1/StudentController`, `StaffController`, `CompanyController`, `AnnouncementController`, `MasterOptionController`, `CampusController` (bootstrap, demo reset, summary), `Interviews/InterviewController`, `Students/ResumeController`, `Students/ReadinessController` |
| `Http/Requests/` | FormRequests, grouped by module. `authorize()` returns a `Response` with a clear message; `toData()` builds the DTO. | `Students/`, `Staff/`, `Companies/`, `Announcements/`, `MasterOptions/`, `Auth/`, `Interviews/`, `Students/Me/` |
| `Http/Resources/` | API Resources: the JSON contract with the frontend. | `StudentResource`, `StaffMemberResource`, `InterviewSessionResource`, `InterviewDetailResource`, `TurnResource`, `InterviewEvaluationResource`, `SkillGapReportResource`, `ResumeResource`, `ResumeDetailResource`, `ResumeAnalysisResource`, `AiRecommendationResource`, `StudentReadinessResource` |
| `Http/Middleware/` | Request middleware. | `MarkSampleData` (flags sample-data endpoints) |
| `Jobs/` | Queued work, e.g. CGPA/backlog recalculation and AI resume analysis. | `RecalculateAcademicSummary`, `ParseResumeJob`, `AnalyzeResumeJob`, `EvaluateInterviewJob`, `GenerateSkillGapReportJob`, `RecalculateReadinessJob` (all carry the institution id and use `Tenant::runAs`) |
| `Mail/`, `Notifications/` | Outgoing email and notifications. | Empty |
| `Models/` | Eloquent models: relations, casts, small model-level queries. | `MasterOption::usageCount()`, `Institution::forNewAccountsOf()` |
| `Observers/` | Model lifecycle hooks. | `UserObserver`, `DesignationObserver` (permission sync) |
| `Policies/` | Record-level authorization, auto-discovered by model name. Admins pass through `Gate::before`. | `StudentPolicy`, `SubjectPolicy` (who enters and reviews a subject's marks) |
| `Providers/` | Service providers. | `AppServiceProvider` |
| `Repositories/` | Reusable read queries, above all visibility rules that several places must agree on. Simple one-off queries can stay in the controller. | `StudentRepository::visibleTo()` (used by the list endpoint and the bootstrap dataset), `MarkEntryRepository` (marks visibility, class roster) |
| `Services/` | Larger services that combine several models. | `Campus/CampusDataService` (bootstrap dataset, session payload), `PermissionService`, `Ai/AiClient` (the only way to call an LLM: fallback chain, `ai_usage_logs`; returns null so callers fall back to deterministic engines), `Ai/*` (interview planner, conductor, evaluator, skill gap, readiness), `Resumes/*` (PDF / DOCX text extraction, parsing, ATS analysis) |
| `Support/` | Static catalogues and rule tables with no database writes. | `Campus/CampusPermission`, `CampusMasterCatalog`, `CampusStaffAccess`, `CampusStudentAccess` |
| `Traits/` | Shared model behaviour. | `LogsActivity` |
| `ValueObjects/` | Small immutable values with their own format rules. | `RegistrationNumber` (`BIT26CSE021`) |

## Multi-tenancy (institutions)

One database, one schema, an `institution_id` on every institution-owned row. The institution always comes from the signed-in user, never from request input.

```
auth:sanctum → SetTenant (Http/Middleware)        sets Support/Tenancy/Tenant from the user;
                                                   Super Admin = bypass; no institution = 403
             → SubstituteBindings                 runs after SetTenant (priority set in
                                                   bootstrap/app.php), so {student} etc. of
                                                   another institution → 404
             → permission:...  → controller
```

- **Models**: add `use BelongsToInstitution` (in `Traits/`). Reads get `WHERE institution_id = ?` (`InstitutionScope`); for an institution user, `create()` always stamps their institution and `institution_id` can't be changed on update.
- **Validation**: `Rule::exists` / `Rule::unique` query the database directly and are **not** scoped. On tenant tables use `TenantRule::exists()` / `TenantRule::unique()`.
- **Raw queries**: `DB::table(...)` bypasses the scope. Avoid it in request code; where unavoidable, filter by `app(Tenant::class)->id()` yourself.
- **No tenant context** (console, seeders, queued jobs, self-registration): nothing is filtered and nothing is stamped, so set `institution_id` explicitly or wrap the work in `app(Tenant::class)->runAs($institutionId, fn () => ...)`. Queued jobs must carry the institution id and use `runAs` in `handle()`.
- **Platform code** that must see every institution: `Model::withoutGlobalScope(InstitutionScope::class)`.
- **New tables** holding institution data get `institution_id` (NOT NULL, foreign key, indexed) and per-institution unique keys from the start.
- `TenantIsolationTest` must keep passing: add every new route group to it.

## Rules

- **Validation** lives in a FormRequest, never in a controller.
- **Authorization** happens in three places: route middleware checks the module permission; FormRequest `authorize()` or a Policy checks the specific record; Actions throw `BusinessRuleException` for business rules such as "drive is closed".
- **Writes** with more than one step go in an Action. A single `Model::create($request->...)` can stay in the controller (see `CompanyController`, `AnnouncementController`).
- **JSON** shape comes from Resources or from `CampusDataService`. Keep the camelCase field names the frontend uses.
- **Roles**: compare with `UserRole` cases or the helpers on `User` (`isAdmin()`, `isInstitutionStaff()`), never string literals.

## Not yet moved to this structure

These still follow the older style (validation and logic inside the controller) and should be moved module by module, with tests first:

- `Api/V1`: `CourseController`, `SubjectController`, `SemesterController`, `DepartmentController`, `DesignationController`
- `Http/Controllers/AttendanceController`, `PermissionController`
- `Api/Staff/*` and `Api/Student/{Materials,Notifications}Controller`, which return sample data (see `MarkSampleData`)

## Tests

`php artisan test`. Feature tests in `tests/Feature` cover the HTTP contract of every endpoint in the moved modules; `CampusResourcesTest` was written before the restructure to prove the responses did not change.
