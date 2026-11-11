<?php

use App\Http\Controllers\Api\Staff\AttendanceController as StaffAttendanceController;
use App\Http\Controllers\Api\Staff\DepartmentController as StaffDepartmentController;
use App\Http\Controllers\Api\Staff\ExamCoordinatorController;
use App\Http\Controllers\Api\Staff\MarksController as StaffMarksController;
use App\Http\Controllers\Api\Staff\PlacementController;
use App\Http\Controllers\Api\Staff\ReportsController;
use App\Http\Controllers\Api\Staff\StaffManagementController;
use App\Http\Controllers\Api\Student\AttendanceController as StudentAttendanceController;
use App\Http\Controllers\Api\Student\MarksController;
use App\Http\Controllers\Api\Student\MaterialsController;
use App\Http\Controllers\Api\Student\StudentResultController;
use App\Http\Controllers\Api\Student\TimetableController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\SessionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CampusController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\CustomFieldController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DesignationController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\GradeRuleController;
use App\Http\Controllers\Api\V1\Interviews\InterviewController;
use App\Http\Controllers\Api\V1\BatchController;
use App\Http\Controllers\Api\V1\CampusSiteController;
use App\Http\Controllers\Api\V1\InstitutionSettingsController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\Auth\MfaController;
use App\Http\Controllers\Api\V1\Owner\OwnerAiController;
use App\Http\Controllers\Api\V1\Owner\OwnerBillingController;
use App\Http\Controllers\Api\V1\Owner\OwnerContentController;
use App\Http\Controllers\Api\V1\Owner\OwnerDashboardController;
use App\Http\Controllers\Api\V1\Owner\OwnerDataController;
use App\Http\Controllers\Api\V1\Owner\OwnerInstitutionController;
use App\Http\Controllers\Api\V1\Owner\OwnerIntegrationController;
use App\Http\Controllers\Api\V1\Owner\OwnerOnboardingCrmController;
use App\Http\Controllers\Api\V1\Owner\OwnerOversightController;
use App\Http\Controllers\Api\V1\Owner\OwnerPlanController;
use App\Http\Controllers\Api\V1\Owner\OwnerPlatformController;
use App\Http\Controllers\Api\V1\Owner\OwnerReportController;
use App\Http\Controllers\Api\V1\Owner\OwnerRoleController;
use App\Http\Controllers\Api\V1\Owner\OwnerSubscriptionController;
use App\Http\Controllers\Api\V1\Owner\OwnerSupportController;
use App\Http\Controllers\Api\V1\Owner\OwnerUserController;
use App\Support\Owner\OwnerPermission as OP;
use App\Http\Controllers\Api\V1\Placement\PlacementJobController;
use App\Http\Controllers\Api\V1\Placement\StudentJobController;
use App\Http\Controllers\Api\V1\InvitationController;
use App\Http\Controllers\Api\V1\PlacementPolicyController;
use App\Http\Controllers\Api\V1\MarkEntryController;
use App\Http\Controllers\Api\V1\MarkReviewController;
use App\Http\Controllers\Api\V1\MarkSchemeController;
use App\Http\Controllers\Api\V1\MasterOptionController;
use App\Http\Controllers\Api\V1\RegistrationController;
use App\Http\Controllers\Api\V1\ResultPublishingController;
use App\Http\Controllers\Api\V1\SemesterController;
use App\Http\Controllers\Api\V1\SkillController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\StudentResumeController;
use App\Http\Controllers\Api\V1\Students\ReadinessController;
use App\Http\Controllers\Api\V1\Students\ResumeController;
use App\Http\Controllers\Api\V1\Students\StudentAcademicsController;
use App\Http\Controllers\Api\V1\Students\StudentCertificationController;
use App\Http\Controllers\Api\V1\Students\StudentExperienceController;
use App\Http\Controllers\Api\V1\Students\StudentProfileController;
use App\Http\Controllers\Api\V1\Students\StudentProjectController;
use App\Http\Controllers\Api\V1\Students\StudentSkillController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\PermissionController;
use App\Models\Student;
use App\Models\StudentAcademic;
use App\Models\StudentCertification;
use App\Models\StudentExperience;
use App\Models\StudentProject;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Support\Facades\Route;

// Route parameters resolved to models (and scoped to the caller's institution) for
// controllers that read them through the request instead of a type-hinted argument.
Route::model('project', StudentProject::class);
Route::model('certification', StudentCertification::class);
Route::model('experience', StudentExperience::class);
Route::model('education', StudentAcademic::class);
Route::model('student', Student::class);
Route::model('registration', User::class);

Route::prefix('v1')->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/owner/auth/login', [AuthController::class, 'ownerLogin'])->middleware('throttle:login');
    Route::post('/auth/mfa/verify', [MfaController::class, 'verify'])->middleware('throttle:login');
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:password-reset');
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:password-reset');

    // Link in the verification email; works without signing in (pending accounts can't).
    Route::get('/auth/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->whereNumber('id')
        ->middleware(['signed', 'throttle:password-reset'])
        ->name('verification.verify');

    // Accepting an invitation creates the account, so these are public; the token is the credential.
    Route::get('/invitations/accept/{token}', [InvitationController::class, 'preview'])->middleware('throttle:invitation');
    Route::post('/invitations/accept/{token}', [InvitationController::class, 'accept'])->middleware('throttle:invitation');

    // Signed, short-lived link from photoUrl; no token so <img> tags can load it.
    Route::get('/files/student-photos/{student}', [StudentProfileController::class, 'photo'])
        ->whereNumber('student')
        ->middleware('signed')
        ->name('students.photo');

    Route::get('/files/resumes/{resume}', [ResumeController::class, 'file'])
        ->whereNumber('resume')
        ->middleware('signed')
        ->name('resumes.download');

    // tenant: limits every query to the signed-in user's institution (see App\Http\Middleware\SetTenant).
    Route::middleware(['auth:sanctum', 'tenant', 'throttle:api'])->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/email/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:verification');

        Route::get('/auth/sessions', [SessionController::class, 'index']);
        Route::delete('/auth/sessions', [SessionController::class, 'destroyOthers']);
        Route::delete('/auth/sessions/{session}', [SessionController::class, 'destroy'])->whereNumber('session');

        // Onboarding (PRD §6): invitations, self-registration approval, audit log.
        $invite = 'permission:'.CampusPermission::USERS_CREATE.',sanctum';
        Route::get('/invitations', [InvitationController::class, 'index'])->middleware($invite);
        Route::post('/invitations', [InvitationController::class, 'store'])->middleware([$invite, 'throttle:uploads']);
        Route::post('/invitations/{invitation}/resend', [InvitationController::class, 'resend'])->whereNumber('invitation')->middleware($invite);
        Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->whereNumber('invitation')->middleware($invite);

        $approve = 'permission:'.CampusPermission::STUDENTS_CREATE.',sanctum';
        Route::get('/registrations', [RegistrationController::class, 'index'])->middleware($approve);
        Route::post('/registrations/{registration}/approve', [RegistrationController::class, 'approve'])->whereNumber('registration')->middleware($approve);
        Route::post('/registrations/{registration}/reject', [RegistrationController::class, 'reject'])->whereNumber('registration')->middleware($approve);

        Route::get('/audit-logs', [AuditLogController::class, 'index'])
            ->middleware('permission:'.CampusPermission::ACTIVITY_VIEW.',sanctum');

        // Institution foundation (plan Slice 2): profile and branding, campuses, batches,
        // placement policy. Branding is readable by every member of the institution.
        Route::get('/institution', [InstitutionSettingsController::class, 'show']);
        $settings = 'permission:'.CampusPermission::SETTINGS_MANAGE.',sanctum';
        Route::put('/institution/settings', [InstitutionSettingsController::class, 'update'])->middleware($settings);
        Route::post('/institution/logo', [InstitutionSettingsController::class, 'uploadLogo'])->middleware([$settings, 'throttle:uploads']);

        $viewStructure = 'permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum';
        $manageStructure = 'permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum';
        Route::get('/campuses', [CampusSiteController::class, 'index'])->middleware($viewStructure);
        Route::post('/campuses', [CampusSiteController::class, 'store'])->middleware($manageStructure);
        Route::put('/campuses/{campus}', [CampusSiteController::class, 'update'])->whereNumber('campus')->middleware($manageStructure);
        Route::delete('/campuses/{campus}', [CampusSiteController::class, 'destroy'])->whereNumber('campus')->middleware($manageStructure);

        Route::get('/batches', [BatchController::class, 'index'])->middleware($viewStructure);
        Route::post('/batches', [BatchController::class, 'store'])->middleware($manageStructure);
        Route::put('/batches/{batch}', [BatchController::class, 'update'])->whereNumber('batch')->middleware($manageStructure);
        Route::delete('/batches/{batch}', [BatchController::class, 'destroy'])->whereNumber('batch')->middleware($manageStructure);
        Route::post('/batches/{batch}/students', [BatchController::class, 'assignStudents'])->whereNumber('batch')->middleware($manageStructure);
        Route::delete('/batches/{batch}/students', [BatchController::class, 'removeStudents'])->whereNumber('batch')->middleware($manageStructure);

        Route::get('/placement-policy', [PlacementPolicyController::class, 'show'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
        Route::put('/placement-policy', [PlacementPolicyController::class, 'update'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');

        Route::get('/campus/bootstrap', [CampusController::class, 'bootstrap'])
            ->middleware('permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum');
        Route::post('/campus/reset', [CampusController::class, 'reset'])
            ->middleware('permission:'.CampusPermission::DEMO_RESET.',sanctum');

        Route::get('/masters', [MasterOptionController::class, 'index'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::post('/masters', [MasterOptionController::class, 'store'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/masters/{master}', [MasterOptionController::class, 'update'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/masters/{master}', [MasterOptionController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');

        // Courses Routes
        Route::get('/courses', [CourseController::class, 'index'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/courses/{course}', [CourseController::class, 'show'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::post('/courses', [CourseController::class, 'store'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/courses/{course}', [CourseController::class, 'update'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/courses/{course}', [CourseController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::get('/courses/list/departments', [CourseController::class, 'getDepartments'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/courses/list/select', [CourseController::class, 'getCoursesForSelect'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/courses/list/staff', [CourseController::class, 'getStaffForCoordinator'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');

        // Subjects Routes
        Route::get('/subjects', [SubjectController::class, 'index'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/subjects/{subject}', [SubjectController::class, 'show'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::post('/subjects', [SubjectController::class, 'store'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/subjects/{subject}', [SubjectController::class, 'update'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::get('/subjects/list/courses', [SubjectController::class, 'getCourses'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');

        // Semesters Routes
        Route::get('/semesters', [SemesterController::class, 'index'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/semesters/{semester}', [SemesterController::class, 'show'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::post('/semesters', [SemesterController::class, 'store'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/semesters/{semester}', [SemesterController::class, 'update'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/semesters/{semester}', [SemesterController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::get('/semesters/list/academic-years', [SemesterController::class, 'getAcademicYears'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::get('/semesters/list/options', [SemesterController::class, 'getSemesterOptions'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');

        // Improved Department Routes (V1)
        Route::prefix('departments')->group(function (): void {
            Route::get('/', [DepartmentController::class, 'index'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
            Route::post('/', [DepartmentController::class, 'store'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
            Route::get('/{department}', [DepartmentController::class, 'show'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
            Route::put('/{department}', [DepartmentController::class, 'update'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_EDIT.',sanctum');
            Route::delete('/{department}', [DepartmentController::class, 'destroy'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_DELETE.',sanctum');
            Route::get('/{department}/stats', [DepartmentController::class, 'getStats'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
            Route::get('/list/hod-options', [DepartmentController::class, 'getHodOptions'])
                ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        });

        // Designation Routes with Permissions (RBAC)
        Route::prefix('designations')->group(function (): void {
            Route::get('/', [DesignationController::class, 'index'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_VIEW.',sanctum');
            Route::post('/', [DesignationController::class, 'store'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_CREATE.',sanctum');
            Route::get('/{designation}', [DesignationController::class, 'show'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_VIEW.',sanctum');
            Route::put('/{designation}', [DesignationController::class, 'update'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_EDIT.',sanctum');
            Route::delete('/{designation}', [DesignationController::class, 'destroy'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_DELETE.',sanctum');
            Route::get('/list/departments', [DesignationController::class, 'getDepartments'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_VIEW.',sanctum');
            Route::get('/list/permissions', [DesignationController::class, 'getPermissions'])
                ->middleware('permission:'.CampusPermission::PERMISSIONS_VIEW.',sanctum');
            Route::get('/list/global', [DesignationController::class, 'getGlobal'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_VIEW.',sanctum');
            Route::get('/{department}/by-department', [DesignationController::class, 'getByDepartment'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_VIEW.',sanctum');
            Route::post('/{designation}/assign-permissions', [DesignationController::class, 'assignPermissions'])
                ->middleware('permission:'.CampusPermission::DESIGNATIONS_EDIT.',sanctum');
        });

        // Permissions Management Routes (RBAC)
        // Removed: permissions-v1 routes (old system using custom Permission model)
        // Use /api/permissions routes instead (via PermissionController)

        // Student self-service (Student Journey spec steps 2 and 6). Registered before
        // /students/{student} so "me" is never read as a student id.
        Route::prefix('students/me')->group(function (): void {
            $view = 'permission:'.CampusPermission::PROFILE_VIEW.',sanctum';
            $edit = 'permission:'.CampusPermission::PROFILE_EDIT.',sanctum';

            Route::get('/profile', [StudentProfileController::class, 'show'])->middleware($view);
            Route::put('/profile', [StudentProfileController::class, 'update'])->middleware($edit);
            Route::post('/profile/photo', [StudentProfileController::class, 'uploadPhoto'])->middleware([$edit, 'throttle:uploads']);

            foreach ([
                'projects' => [StudentProjectController::class, 'project'],
                'certifications' => [StudentCertificationController::class, 'certification'],
                'experience' => [StudentExperienceController::class, 'experience'],
            ] as $path => [$controller, $parameter]) {
                Route::get("/{$path}", [$controller, 'index'])->middleware($view);
                Route::post("/{$path}", [$controller, 'store'])->middleware($edit);
                Route::put("/{$path}/{{$parameter}}", [$controller, 'update'])->middleware($edit);
                Route::delete("/{$path}/{{$parameter}}", [$controller, 'destroy'])->middleware($edit);
            }

            Route::get('/skills', [StudentSkillController::class, 'index'])->middleware($view);
            Route::put('/skills', [StudentSkillController::class, 'update'])->middleware($edit);
            Route::delete('/skills/{skill}', [StudentSkillController::class, 'destroy'])->middleware($edit);

            // Step 3: academic summary (read-only) and prior education.
            Route::get('/academics', [StudentAcademicsController::class, 'show'])->middleware($view);
            Route::post('/education', [StudentAcademicsController::class, 'storeEducation'])->middleware($edit);
            Route::put('/education/{education}', [StudentAcademicsController::class, 'updateEducation'])->middleware($edit);
            Route::delete('/education/{education}', [StudentAcademicsController::class, 'destroyEducation'])->middleware($edit);

            // AI Interview Journey (documentation/ai-interview-journey-backend-spec.md).
            $resumes = 'permission:'.CampusPermission::RESUMES_MANAGE.',sanctum';
            Route::get('/resumes', [ResumeController::class, 'index'])->middleware($resumes);
            Route::post('/resumes', [ResumeController::class, 'store'])->middleware([$resumes, 'throttle:uploads']);
            Route::get('/resumes/{resume}', [ResumeController::class, 'show'])->whereNumber('resume')->middleware($resumes);
            Route::get('/resumes/{resume}/analysis', [ResumeController::class, 'analysis'])->whereNumber('resume')->middleware($resumes);
            Route::get('/resumes/{resume}/download', [ResumeController::class, 'download'])->whereNumber('resume')->middleware($resumes);
            Route::post('/resumes/{resume}/analysis', [ResumeController::class, 'queueAnalysis'])->whereNumber('resume')->middleware([$resumes, 'throttle:ai']);
            Route::delete('/resumes/{resume}', [ResumeController::class, 'destroy'])->whereNumber('resume')->middleware($resumes);

            $practice = 'permission:'.CampusPermission::INTERVIEWS_PRACTICE.',sanctum';
            Route::post('/interviews', [InterviewController::class, 'store'])->middleware([$practice, 'throttle:ai']);
            Route::get('/interviews', [InterviewController::class, 'history'])->middleware($practice);

            Route::get('/recommendations', [ReadinessController::class, 'recommendations'])->middleware($view);
            Route::patch('/recommendations/{recommendation}', [ReadinessController::class, 'updateRecommendation'])->whereNumber('recommendation')->middleware($view);
            Route::get('/readiness', [ReadinessController::class, 'readiness'])->middleware($view);
            Route::get('/readiness/history', [ReadinessController::class, 'readinessHistory'])->middleware($view);
            Route::get('/readiness-score', [ReadinessController::class, 'readinessScore'])->middleware($view);
        });

        // Interview sessions: the owning student only (other students and institutions → 404).
        Route::prefix('interviews/{interview}')
            ->whereNumber('interview')
            ->middleware('permission:'.CampusPermission::INTERVIEWS_PRACTICE.',sanctum')
            ->group(function (): void {
                Route::get('/', [InterviewController::class, 'show']);
                Route::post('/start', [InterviewController::class, 'start'])->middleware('throttle:ai');
                Route::post('/answers', [InterviewController::class, 'answerFromSpec'])->middleware('throttle:ai-answers');
                Route::post('/turns/{turn}/answer', [InterviewController::class, 'answer'])->whereNumber('turn')->scopeBindings()->middleware('throttle:ai-answers');
                Route::post('/finish', [InterviewController::class, 'finish'])->middleware('throttle:ai');
                Route::get('/report', [InterviewController::class, 'report']);
                Route::get('/evaluation', [InterviewController::class, 'evaluation']);
                Route::get('/skill-gap', [InterviewController::class, 'skillGap']);
            });

        Route::get('/skills', [SkillController::class, 'index'])
            ->middleware('permission:'.CampusPermission::PROFILE_VIEW.',sanctum');
        Route::get('/students/{student}/profile', [StudentProfileController::class, 'showForStaff'])
            ->whereNumber('student')
            ->middleware('permission:'.CampusPermission::STUDENTS_VIEW.',sanctum');
        Route::get('/students/{student}/academics', [StudentAcademicsController::class, 'showForStaff'])
            ->whereNumber('student')
            ->middleware('permission:'.CampusPermission::STUDENTS_VIEW.',sanctum');
        Route::post('/students/{student}/education/{education}/verify', [StudentAcademicsController::class, 'verify'])
            ->whereNumber('student')
            ->middleware('permission:'.CampusPermission::STUDENTS_EDIT.',sanctum');
        Route::post('/students/{student}/academics/recalculate', [StudentAcademicsController::class, 'recalculate'])
            ->whereNumber('student')
            ->middleware('permission:'.CampusPermission::STUDENTS_EDIT.',sanctum');

        Route::get('/students', [StudentController::class, 'index'])
            ->middleware('permission:'.CampusPermission::STUDENTS_VIEW.',sanctum');
        Route::put('/students/me/resume', [StudentResumeController::class, 'update'])
            ->middleware('permission:'.CampusPermission::PROFILE_EDIT.',sanctum');
        Route::post('/students', [StudentController::class, 'store'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');
        Route::put('/students/{student}', [StudentController::class, 'update'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');
        Route::delete('/students/{student}', [StudentController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');

        Route::get('/staff', [StaffController::class, 'index'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::post('/staff', [StaffController::class, 'store'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/staff/{staff}', [StaffController::class, 'update'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');

        // Custom form fields. Definitions are readable by everyone (forms need them); values are
        // authorised per record type in the controller.
        $manageFields = 'permission:'.CampusPermission::CUSTOM_FIELDS_MANAGE.',sanctum';
        Route::get('/custom-fields', [CustomFieldController::class, 'index']);
        Route::post('/custom-fields', [CustomFieldController::class, 'store'])->middleware($manageFields);
        Route::patch('/custom-fields/{customField}', [CustomFieldController::class, 'update'])->whereNumber('customField')->middleware($manageFields);
        Route::delete('/custom-fields/{customField}', [CustomFieldController::class, 'destroy'])->whereNumber('customField')->middleware($manageFields);
        Route::get('/custom-fields/values/{entity}/{id}', [CustomFieldController::class, 'showValues'])
            ->whereIn('entity', ['student', 'staff', 'subject', 'exam'])->whereNumber('id');
        Route::put('/custom-fields/values/{entity}/{id}', [CustomFieldController::class, 'updateValues'])
            ->whereIn('entity', ['student', 'staff', 'subject', 'exam'])->whereNumber('id');

        // Dashboards: role templates, user-built dashboards and the widget query engine.
        // Every query runs within the caller's own data scope (App\Services\Dashboards\DashboardScope).
        $viewDashboards = 'permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum';
        $buildDashboards = 'permission:'.CampusPermission::DASHBOARDS_BUILD.',sanctum';
        Route::middleware($viewDashboards)->group(function () use ($buildDashboards): void {
            Route::get('/dashboards/sources', [DashboardController::class, 'sources']);
            Route::post('/dashboards/query', [DashboardController::class, 'query']);
            Route::get('/dashboards', [DashboardController::class, 'index']);
            Route::get('/dashboards/home', [DashboardController::class, 'home']);
            Route::get('/dashboards/{dashboard}', [DashboardController::class, 'show'])->whereNumber('dashboard');
            Route::post('/dashboards', [DashboardController::class, 'store'])->middleware($buildDashboards);
            Route::patch('/dashboards/{dashboard}', [DashboardController::class, 'update'])->whereNumber('dashboard')->middleware($buildDashboards);
            Route::delete('/dashboards/{dashboard}', [DashboardController::class, 'destroy'])->whereNumber('dashboard')->middleware($buildDashboards);
            Route::put('/dashboards/{dashboard}/share', [DashboardController::class, 'share'])->whereNumber('dashboard')
                ->middleware('permission:'.CampusPermission::DASHBOARDS_SHARE.',sanctum');
        });

        Route::middleware('deprecated:placement/jobs')->group(function (): void {
            Route::get('/companies', [CompanyController::class, 'index'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
            Route::post('/companies', [CompanyController::class, 'store'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
            Route::put('/companies/{company}', [CompanyController::class, 'update'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
            Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
            // Applying needs a verified email address (PRD §6): recruiters and officers contact it.
            Route::post('/companies/{company}/apply', [CompanyController::class, 'apply'])
                ->middleware(['permission:'.CampusPermission::PLACEMENT_APPLY.',sanctum', 'verified']);
        });

        // Placement on the job-posting model (PRD v1.1 §6, §10): jobs with eligibility rules,
        // the application pipeline, rounds, offers and placement policies.
        $placementView = 'permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum';
        $placementApply = 'permission:'.CampusPermission::PLACEMENT_APPLY.',sanctum';
        $placementCreate = 'permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum';
        $placementManage = 'permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum';
        $placementRounds = 'permission:'.CampusPermission::PLACEMENT_SCHEDULE_ROUND.',sanctum';
        // Officer-side reads: students also hold placement.view, but must not see other applicants.
        $placementStaff = 'permission:'.CampusPermission::PLACEMENT_VIEW_RESULTS.',sanctum';

        Route::get('/students/me/jobs', [StudentJobController::class, 'index'])->middleware($placementView);
        Route::get('/students/me/jobs/{job}', [StudentJobController::class, 'show'])->whereNumber('job')->middleware($placementView);
        Route::post('/students/me/jobs/{job}/apply', [StudentJobController::class, 'apply'])->whereNumber('job')->middleware([$placementApply, 'verified']);
        Route::get('/students/me/applications', [StudentJobController::class, 'applications'])->middleware($placementView);
        Route::post('/students/me/applications/{application}/withdraw', [StudentJobController::class, 'withdraw'])->whereNumber('application')->middleware($placementApply);
        Route::post('/students/me/applications/{application}/offer/accept', [StudentJobController::class, 'acceptOffer'])->whereNumber('application')->middleware($placementApply);
        Route::post('/students/me/applications/{application}/offer/decline', [StudentJobController::class, 'declineOffer'])->whereNumber('application')->middleware($placementApply);
        Route::put('/students/me/placement-preference', [StudentJobController::class, 'updatePreference'])->middleware($placementApply);

        Route::prefix('placement')->group(function () use ($placementStaff, $placementCreate, $placementManage, $placementRounds): void {
            Route::get('/jobs', [PlacementJobController::class, 'index'])->middleware($placementStaff);
            Route::post('/jobs', [PlacementJobController::class, 'store'])->middleware($placementCreate);
            Route::post('/eligibility/preview', [PlacementJobController::class, 'preview'])->middleware($placementStaff);
            Route::get('/jobs/{job}', [PlacementJobController::class, 'show'])->whereNumber('job')->middleware($placementStaff);
            Route::patch('/jobs/{job}', [PlacementJobController::class, 'update'])->whereNumber('job')->middleware($placementManage);
            Route::delete('/jobs/{job}', [PlacementJobController::class, 'destroy'])->whereNumber('job')->middleware($placementManage);
            Route::post('/jobs/{job}/publish', [PlacementJobController::class, 'publish'])->whereNumber('job')->middleware($placementManage);
            Route::post('/jobs/{job}/close', [PlacementJobController::class, 'close'])->whereNumber('job')->middleware($placementManage);
            Route::get('/jobs/{job}/eligible-students', [PlacementJobController::class, 'eligibleStudents'])->whereNumber('job')->middleware($placementStaff);
            Route::get('/jobs/{job}/applications', [PlacementJobController::class, 'applications'])->whereNumber('job')->middleware($placementStaff);
            Route::post('/applications/status', [PlacementJobController::class, 'updateStatus'])->middleware($placementManage);
            Route::post('/applications/{application}/offer', [PlacementJobController::class, 'offer'])->whereNumber('application')->middleware($placementManage);
            Route::get('/jobs/{job}/rounds', [PlacementJobController::class, 'rounds'])->whereNumber('job')->middleware($placementStaff);
            Route::post('/jobs/{job}/rounds', [PlacementJobController::class, 'storeRound'])->whereNumber('job')->middleware($placementRounds);
            Route::patch('/rounds/{round}', [PlacementJobController::class, 'updateRound'])->whereNumber('round')->middleware($placementRounds);
            Route::delete('/rounds/{round}', [PlacementJobController::class, 'destroyRound'])->whereNumber('round')->middleware($placementRounds);
            Route::put('/rounds/{round}/results', [PlacementJobController::class, 'recordResults'])->whereNumber('round')->middleware($placementRounds);
            Route::post('/students/{student}/debar', [PlacementJobController::class, 'debar'])->whereNumber('student')->middleware($placementManage);
            Route::delete('/students/{student}/debar', [PlacementJobController::class, 'lift'])->whereNumber('student')->middleware($placementManage);
        });

        // Two-step verification for platform staff (Owner Dashboard SRS IAM-004).
        Route::get('/auth/mfa', [MfaController::class, 'show']);
        Route::post('/auth/mfa/setup', [MfaController::class, 'setup']);
        Route::post('/auth/mfa/confirm', [MfaController::class, 'confirm'])->middleware('throttle:login');
        Route::post('/auth/mfa/disable', [MfaController::class, 'disable'])->middleware('throttle:login');

        // Owner console (Owner Dashboard SRS R1). `owner:` checks platform permissions, never Gate.
        Route::prefix('owner')->group(function (): void {
            Route::get('/dashboard/summary', [OwnerDashboardController::class, 'summary'])->middleware('owner:'.OP::DASHBOARD_VIEW);
            Route::get('/dashboard/trends', [OwnerDashboardController::class, 'trends'])->middleware('owner:'.OP::DASHBOARD_VIEW);
            Route::get('/dashboard/alerts', [OwnerDashboardController::class, 'alerts'])->middleware('owner:'.OP::DASHBOARD_VIEW);
            Route::get('/dashboard/activity', [OwnerDashboardController::class, 'activity'])->middleware('owner:'.OP::DASHBOARD_VIEW);

            Route::get('/institutions', [OwnerInstitutionController::class, 'index'])->middleware('owner:'.OP::INSTITUTIONS_VIEW);
            Route::get('/institutions/export', [OwnerInstitutionController::class, 'export'])->middleware(['owner:'.OP::INSTITUTIONS_EXPORT, 'throttle:exports']);
            Route::post('/institutions', [OwnerInstitutionController::class, 'store'])->middleware('owner:'.OP::INSTITUTIONS_CREATE);
            Route::get('/institutions/{institution}', [OwnerInstitutionController::class, 'show'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_VIEW);
            Route::patch('/institutions/{institution}', [OwnerInstitutionController::class, 'update'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_EDIT);
            Route::post('/institutions/{institution}/verify', [OwnerInstitutionController::class, 'verify'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_VERIFY);
            Route::post('/institutions/{institution}/status', [OwnerInstitutionController::class, 'changeStatus'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_SUSPEND);
            Route::get('/institutions/{institution}/history', [OwnerInstitutionController::class, 'history'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_VIEW);
            Route::get('/institutions/{institution}/logs', [OwnerInstitutionController::class, 'logs'])->whereNumber('institution')->middleware('owner:'.OP::AUDIT_VIEW);
            Route::get('/institutions/{institution}/logo', [OwnerInstitutionController::class, 'showLogo'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_VIEW);
            Route::post('/institutions/{institution}/logo', [OwnerInstitutionController::class, 'uploadLogo'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_EDIT);
            Route::delete('/institutions/{institution}/logo', [OwnerInstitutionController::class, 'deleteLogo'])->whereNumber('institution')->middleware('owner:'.OP::INSTITUTIONS_EDIT);
            Route::get('/institutions/{institution}/settings', [OwnerInstitutionController::class, 'settings'])->whereNumber('institution')->middleware('owner:'.OP::SETTINGS_VIEW);
            Route::put('/institutions/{institution}/settings', [OwnerInstitutionController::class, 'updateSettings'])->whereNumber('institution')->middleware('owner:'.OP::SETTINGS_MANAGE);

            Route::get('/users', [OwnerUserController::class, 'index'])->middleware('owner:'.OP::USERS_VIEW);
            Route::post('/users/invitations', [OwnerUserController::class, 'invite'])->middleware('owner:'.OP::USERS_INVITE);
            Route::get('/users/{user}', [OwnerUserController::class, 'show'])->whereNumber('user')->middleware('owner:'.OP::USERS_VIEW);
            Route::patch('/users/{user}', [OwnerUserController::class, 'update'])->whereNumber('user')->middleware('owner:'.OP::ROLES_MANAGE);
            Route::post('/users/{user}/status', [OwnerUserController::class, 'changeStatus'])->whereNumber('user')->middleware('owner:'.OP::USERS_SUSPEND);
            Route::post('/users/{user}/password-reset', [OwnerUserController::class, 'sendPasswordReset'])->whereNumber('user')->middleware('owner:'.OP::USERS_SESSIONS);
            Route::post('/users/{user}/resend-invite', [OwnerUserController::class, 'resendInvite'])->whereNumber('user')->middleware('owner:'.OP::USERS_INVITE);
            Route::delete('/users/{user}/sessions', [OwnerUserController::class, 'revokeSessions'])->whereNumber('user')->middleware('owner:'.OP::USERS_SESSIONS);

            Route::get('/permissions', [OwnerRoleController::class, 'permissions'])->middleware('owner:'.OP::ROLES_VIEW);
            Route::get('/roles', [OwnerRoleController::class, 'index'])->middleware('owner:'.OP::ROLES_VIEW);
            Route::post('/roles', [OwnerRoleController::class, 'store'])->middleware('owner:'.OP::ROLES_MANAGE);
            Route::patch('/roles/{role}', [OwnerRoleController::class, 'update'])->whereNumber('role')->middleware('owner:'.OP::ROLES_MANAGE);
            Route::delete('/roles/{role}', [OwnerRoleController::class, 'destroy'])->whereNumber('role')->middleware('owner:'.OP::ROLES_MANAGE);

            Route::get('/settings', [OwnerPlatformController::class, 'settings'])->middleware('owner:'.OP::SETTINGS_VIEW);
            Route::put('/settings', [OwnerPlatformController::class, 'updateSettings'])->middleware('owner:'.OP::SETTINGS_MANAGE);
            Route::get('/audit-logs', [OwnerPlatformController::class, 'auditLogs'])->middleware('owner:'.OP::AUDIT_VIEW);
            Route::get('/activity-logs', [OwnerPlatformController::class, 'activityLogs'])->middleware('owner:'.OP::AUDIT_VIEW);
            Route::get('/login-history', [OwnerPlatformController::class, 'loginHistory'])->middleware('owner:'.OP::SECURITY_VIEW);
            Route::get('/security-events', [OwnerPlatformController::class, 'securityEvents'])->middleware('owner:'.OP::SECURITY_VIEW);
            Route::patch('/security-events/{securityEvent}', [OwnerPlatformController::class, 'updateSecurityEvent'])->whereNumber('securityEvent')->middleware('owner:'.OP::SETTINGS_MANAGE);
            Route::get('/sessions', [OwnerPlatformController::class, 'sessions'])->middleware('owner:'.OP::SECURITY_VIEW);
            Route::delete('/sessions/{session}', [OwnerPlatformController::class, 'revokeSession'])->whereNumber('session')->middleware('owner:'.OP::USERS_SESSIONS);
            Route::get('/system/health', [OwnerPlatformController::class, 'health'])->middleware('owner:'.OP::SYSTEM_VIEW);
            Route::get('/system/incidents', [OwnerPlatformController::class, 'incidents'])->middleware('owner:'.OP::SYSTEM_VIEW);
            Route::post('/system/incidents', [OwnerPlatformController::class, 'storeIncident'])->middleware('owner:'.OP::SETTINGS_MANAGE);
            Route::patch('/system/incidents/{incident}', [OwnerPlatformController::class, 'updateIncident'])->whereNumber('incident')->middleware('owner:'.OP::SETTINGS_MANAGE);

            // Release 2: Plans & Entitlements (SRS §5.6)
            Route::get('/plans', [OwnerPlanController::class, 'index'])->middleware('owner:'.OP::PLANS_VIEW);
            Route::post('/plans', [OwnerPlanController::class, 'store'])->middleware('owner:'.OP::PLANS_MANAGE);
            Route::get('/plans/{plan}', [OwnerPlanController::class, 'show'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_VIEW);
            Route::patch('/plans/{plan}', [OwnerPlanController::class, 'update'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_MANAGE);
            Route::post('/plans/{plan}/clone', [OwnerPlanController::class, 'clonePlan'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_MANAGE);
            Route::post('/plans/{plan}/publish', [OwnerPlanController::class, 'publish'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_MANAGE);
            Route::post('/plans/{plan}/archive', [OwnerPlanController::class, 'archive'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_MANAGE);
            Route::delete('/plans/{plan}', [OwnerPlanController::class, 'destroy'])->whereNumber('plan')->middleware('owner:'.OP::PLANS_MANAGE);

            // Release 2: Subscriptions & Trials (SRS §5.7)
            Route::get('/subscriptions', [OwnerSubscriptionController::class, 'index'])->middleware('owner:'.OP::SUBSCRIPTIONS_VIEW);
            Route::post('/subscriptions', [OwnerSubscriptionController::class, 'store'])->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::get('/subscriptions/{subscription}', [OwnerSubscriptionController::class, 'show'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_VIEW);
            Route::post('/subscriptions/{subscription}/change-plan', [OwnerSubscriptionController::class, 'changePlan'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::post('/subscriptions/{subscription}/renew', [OwnerSubscriptionController::class, 'renew'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::post('/subscriptions/{subscription}/pause', [OwnerSubscriptionController::class, 'pause'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::post('/subscriptions/{subscription}/resume', [OwnerSubscriptionController::class, 'resume'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::post('/subscriptions/{subscription}/extend', [OwnerSubscriptionController::class, 'extend'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::post('/subscriptions/{subscription}/cancel', [OwnerSubscriptionController::class, 'cancel'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_MANAGE);
            Route::get('/subscriptions/{subscription}/events', [OwnerSubscriptionController::class, 'events'])->whereNumber('subscription')->middleware('owner:'.OP::SUBSCRIPTIONS_VIEW);

            // Release 2: Billing, Invoices, Payments, Refunds, Tax & Coupons (SRS §5.8)
            Route::get('/invoices', [OwnerBillingController::class, 'invoices'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/invoices', [OwnerBillingController::class, 'storeInvoice'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::get('/invoices/{invoice}', [OwnerBillingController::class, 'showInvoice'])->whereNumber('invoice')->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/invoices/{invoice}/issue', [OwnerBillingController::class, 'issueInvoice'])->whereNumber('invoice')->middleware('owner:'.OP::BILLING_MANAGE);
            Route::post('/invoices/{invoice}/void', [OwnerBillingController::class, 'voidInvoice'])->whereNumber('invoice')->middleware('owner:'.OP::BILLING_MANAGE);
            Route::get('/invoices/{invoice}/download', [OwnerBillingController::class, 'downloadInvoice'])->whereNumber('invoice')->middleware('owner:'.OP::BILLING_VIEW);
            Route::get('/payments', [OwnerBillingController::class, 'payments'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/payments', [OwnerBillingController::class, 'recordPayment'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::post('/payments/webhook', [OwnerBillingController::class, 'handleWebhook'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::get('/refunds', [OwnerBillingController::class, 'refunds'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/refunds', [OwnerBillingController::class, 'requestRefund'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::post('/refunds/{refund}/approve', [OwnerBillingController::class, 'approveRefund'])->whereNumber('refund')->middleware('owner:'.OP::BILLING_REFUND);
            Route::post('/refunds/{refund}/reject', [OwnerBillingController::class, 'rejectRefund'])->whereNumber('refund')->middleware('owner:'.OP::BILLING_REFUND);
            Route::post('/refunds/{refund}/execute', [OwnerBillingController::class, 'executeRefund'])->whereNumber('refund')->middleware('owner:'.OP::BILLING_REFUND);
            Route::get('/revenue/summary', [OwnerBillingController::class, 'revenueSummary'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::get('/tax-profiles', [OwnerBillingController::class, 'taxProfiles'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/tax-profiles', [OwnerBillingController::class, 'storeTaxProfile'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::patch('/tax-profiles/{taxProfile}', [OwnerBillingController::class, 'updateTaxProfile'])->whereNumber('taxProfile')->middleware('owner:'.OP::BILLING_MANAGE);
            Route::get('/coupons', [OwnerBillingController::class, 'coupons'])->middleware('owner:'.OP::BILLING_VIEW);
            Route::post('/coupons', [OwnerBillingController::class, 'storeCoupon'])->middleware('owner:'.OP::BILLING_MANAGE);
            Route::patch('/coupons/{coupon}', [OwnerBillingController::class, 'updateCoupon'])->whereNumber('coupon')->middleware('owner:'.OP::BILLING_MANAGE);

            // Release 2: AI Usage, Credit Wallets, Ledger & Providers (SRS §5.9)
            Route::get('/ai/usage', [OwnerAiController::class, 'usage'])->middleware('owner:'.OP::AI_VIEW);
            Route::get('/ai/credits', [OwnerAiController::class, 'credits'])->middleware('owner:'.OP::AI_VIEW);
            Route::get('/ai/credits/{institution}/ledger', [OwnerAiController::class, 'ledger'])->whereNumber('institution')->middleware('owner:'.OP::AI_VIEW);
            Route::post('/ai/credits/adjustments', [OwnerAiController::class, 'adjustCredits'])->middleware('owner:'.OP::AI_CREDITS);
            Route::patch('/ai/credits/{institution}/policy', [OwnerAiController::class, 'updateWalletPolicy'])->whereNumber('institution')->middleware('owner:'.OP::AI_MANAGE);
            Route::get('/ai/providers', [OwnerAiController::class, 'providers'])->middleware('owner:'.OP::AI_VIEW);
            Route::post('/ai/rate-cards', [OwnerAiController::class, 'storeRateCard'])->middleware('owner:'.OP::AI_MANAGE);
            Route::patch('/ai/rate-cards/{rateCard}', [OwnerAiController::class, 'updateRateCard'])->whereNumber('rateCard')->middleware('owner:'.OP::AI_MANAGE);

            // Release 3: Cross-Tenant Oversight & Analytics Reports (SRS §5.10–§5.15, §13)
            Route::get('/oversight/academic', [OwnerOversightController::class, 'academic'])->middleware('owner:'.OP::OVERSIGHT_VIEW);
            Route::get('/oversight/placement', [OwnerOversightController::class, 'placement'])->middleware('owner:'.OP::OVERSIGHT_VIEW);
            Route::get('/oversight/assessments', [OwnerOversightController::class, 'assessments'])->middleware('owner:'.OP::OVERSIGHT_VIEW);
            Route::get('/oversight/resumes', [OwnerOversightController::class, 'resumes'])->middleware('owner:'.OP::OVERSIGHT_VIEW);
            Route::get('/oversight/interviews', [OwnerOversightController::class, 'interviews'])->middleware('owner:'.OP::OVERSIGHT_VIEW);

            Route::get('/reports/catalog', [OwnerReportController::class, 'catalog'])->middleware('owner:'.OP::REPORTS_VIEW);
            Route::get('/reports/preview', [OwnerReportController::class, 'preview'])->middleware('owner:'.OP::REPORTS_VIEW);
            Route::get('/reports/export', [OwnerReportController::class, 'export'])->middleware(['owner:'.OP::REPORTS_EXPORT, 'throttle:exports']);
            Route::get('/reports/saved', [OwnerReportController::class, 'savedIndex'])->middleware('owner:'.OP::REPORTS_VIEW);
            Route::post('/reports/saved', [OwnerReportController::class, 'saveReport'])->middleware('owner:'.OP::REPORTS_VIEW);
            Route::delete('/reports/saved/{savedReport}', [OwnerReportController::class, 'deleteSavedReport'])->whereNumber('savedReport')->middleware('owner:'.OP::REPORTS_VIEW);
            Route::get('/reports/schedules', [OwnerReportController::class, 'schedulesIndex'])->middleware('owner:'.OP::REPORTS_VIEW);
            Route::post('/reports/schedules', [OwnerReportController::class, 'storeSchedule'])->middleware('owner:'.OP::REPORTS_EXPORT);
            Route::patch('/reports/schedules/{reportSchedule}', [OwnerReportController::class, 'updateSchedule'])->whereNumber('reportSchedule')->middleware('owner:'.OP::REPORTS_EXPORT);
            Route::delete('/reports/schedules/{reportSchedule}', [OwnerReportController::class, 'deleteSchedule'])->whereNumber('reportSchedule')->middleware('owner:'.OP::REPORTS_EXPORT);
            Route::get('/reports/exports', [OwnerReportController::class, 'exportsIndex'])->middleware('owner:'.OP::REPORTS_VIEW);

            // Release 4: Onboarding Pipeline & Sales CRM (SRS §5.3, §5.17)
            Route::get('/crm/leads', [OwnerOnboardingCrmController::class, 'leads'])->middleware('owner:'.OP::CRM_VIEW);
            Route::post('/crm/leads', [OwnerOnboardingCrmController::class, 'storeLead'])->middleware('owner:'.OP::CRM_MANAGE);
            Route::get('/crm/leads/{lead}', [OwnerOnboardingCrmController::class, 'showLead'])->whereNumber('lead')->middleware('owner:'.OP::CRM_VIEW);
            Route::patch('/crm/leads/{lead}', [OwnerOnboardingCrmController::class, 'updateLead'])->whereNumber('lead')->middleware('owner:'.OP::CRM_MANAGE);
            Route::post('/crm/leads/{lead}/activities', [OwnerOnboardingCrmController::class, 'addLeadActivity'])->whereNumber('lead')->middleware('owner:'.OP::CRM_MANAGE);
            Route::post('/crm/leads/{lead}/convert', [OwnerOnboardingCrmController::class, 'convertLead'])->whereNumber('lead')->middleware('owner:'.OP::CRM_MANAGE);

            Route::get('/onboarding', [OwnerOnboardingCrmController::class, 'onboardingList'])->middleware('owner:'.OP::ONBOARDING_VIEW);
            Route::post('/onboarding', [OwnerOnboardingCrmController::class, 'storeOnboarding'])->middleware('owner:'.OP::ONBOARDING_MANAGE);
            Route::patch('/onboarding/{onboardingRequest}', [OwnerOnboardingCrmController::class, 'updateOnboarding'])->whereNumber('onboardingRequest')->middleware('owner:'.OP::ONBOARDING_MANAGE);
            Route::post('/onboarding/checklists/{item}/toggle', [OwnerOnboardingCrmController::class, 'toggleChecklist'])->whereNumber('item')->middleware('owner:'.OP::ONBOARDING_MANAGE);
            Route::post('/onboarding/{onboardingRequest}/convert-institution', [OwnerOnboardingCrmController::class, 'convertOnboardingToInstitution'])->whereNumber('onboardingRequest')->middleware('owner:'.OP::INSTITUTIONS_CREATE);

            // Release 4: Support Tickets & SLA (SRS §5.16)
            Route::get('/support/tickets', [OwnerSupportController::class, 'index'])->middleware('owner:'.OP::SUPPORT_VIEW);
            Route::post('/support/tickets', [OwnerSupportController::class, 'store'])->middleware('owner:'.OP::SUPPORT_MANAGE);
            Route::get('/support/tickets/{ticket}', [OwnerSupportController::class, 'show'])->whereNumber('ticket')->middleware('owner:'.OP::SUPPORT_VIEW);
            Route::patch('/support/tickets/{ticket}', [OwnerSupportController::class, 'update'])->whereNumber('ticket')->middleware('owner:'.OP::SUPPORT_MANAGE);
            Route::post('/support/tickets/{ticket}/replies', [OwnerSupportController::class, 'reply'])->whereNumber('ticket')->middleware('owner:'.OP::SUPPORT_MANAGE);
            Route::get('/support/attachments/{attachment}', [OwnerSupportController::class, 'downloadAttachment'])->whereNumber('attachment')->middleware('owner:'.OP::SUPPORT_VIEW);

            // Release 4: Integrations Catalog, API Clients & Webhooks (SRS §5.21)
            Route::get('/integrations', [OwnerIntegrationController::class, 'integrations'])->middleware('owner:'.OP::INTEGRATIONS_VIEW);
            Route::post('/integrations', [OwnerIntegrationController::class, 'saveIntegration'])->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::post('/integrations/{integration}/test', [OwnerIntegrationController::class, 'testIntegration'])->whereNumber('integration')->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::get('/api-clients', [OwnerIntegrationController::class, 'apiClients'])->middleware('owner:'.OP::INTEGRATIONS_VIEW);
            Route::post('/api-clients', [OwnerIntegrationController::class, 'storeApiClient'])->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::post('/api-clients/{apiClient}/revoke', [OwnerIntegrationController::class, 'revokeApiClient'])->whereNumber('apiClient')->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::get('/webhooks', [OwnerIntegrationController::class, 'webhooks'])->middleware('owner:'.OP::INTEGRATIONS_VIEW);
            Route::post('/webhooks', [OwnerIntegrationController::class, 'storeWebhook'])->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::post('/webhooks/{webhook}/test', [OwnerIntegrationController::class, 'testWebhook'])->whereNumber('webhook')->middleware('owner:'.OP::INTEGRATIONS_MANAGE);
            Route::post('/webhooks/{webhook}/toggle', [OwnerIntegrationController::class, 'toggleWebhook'])->whereNumber('webhook')->middleware('owner:'.OP::INTEGRATIONS_MANAGE);

            // Release 4: Data Governance, Backups & Restore Verification (SRS §5.23)
            Route::get('/data/backups', [OwnerDataController::class, 'backups'])->middleware('owner:'.OP::DATA_VIEW);
            Route::post('/data/backups', [OwnerDataController::class, 'triggerBackup'])->middleware('owner:'.OP::DATA_MANAGE);
            Route::post('/data/backups/{backup}/verify', [OwnerDataController::class, 'verifyRestore'])->whereNumber('backup')->middleware('owner:'.OP::DATA_MANAGE);
            Route::get('/data/requests', [OwnerDataController::class, 'requests'])->middleware('owner:'.OP::DATA_VIEW);
            Route::post('/data/requests', [OwnerDataController::class, 'storeRequest'])->middleware('owner:'.OP::DATA_MANAGE);
            Route::post('/data/requests/{dataRequest}/review', [OwnerDataController::class, 'reviewRequest'])->whereNumber('dataRequest')->middleware('owner:'.OP::DATA_MANAGE);

            // Release 4 & 5: Platform Announcements, CMS Pages & Product Releases (SRS §5.18, §5.24, §5.25)
            Route::get('/announcements', [OwnerContentController::class, 'announcements'])->middleware('owner:'.OP::COMMUNICATIONS_VIEW);
            Route::post('/announcements', [OwnerContentController::class, 'storeAnnouncement'])->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
            Route::patch('/announcements/{announcement}', [OwnerContentController::class, 'updateAnnouncement'])->whereNumber('announcement')->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
            Route::get('/cms/pages', [OwnerContentController::class, 'cmsPages'])->middleware('owner:'.OP::COMMUNICATIONS_VIEW);
            Route::post('/cms/pages', [OwnerContentController::class, 'storeCmsPage'])->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
            Route::patch('/cms/pages/{cmsPage}', [OwnerContentController::class, 'updateCmsPage'])->whereNumber('cmsPage')->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
            Route::get('/releases', [OwnerContentController::class, 'releases'])->middleware('owner:'.OP::COMMUNICATIONS_VIEW);
            Route::post('/releases', [OwnerContentController::class, 'storeRelease'])->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
            Route::patch('/releases/{release}', [OwnerContentController::class, 'updateRelease'])->whereNumber('release')->middleware('owner:'.OP::COMMUNICATIONS_MANAGE);
        });

        // In-app notifications and preferences, for every role.
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::get('/notifications/preferences', [NotificationController::class, 'preferences']);
        Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->whereUuid('id');
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->whereUuid('id');

        Route::get('/announcements', [AnnouncementController::class, 'index'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_VIEW.',sanctum');
        Route::post('/announcements', [AnnouncementController::class, 'store'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_CREATE.',sanctum');
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_CREATE.',sanctum');
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_CREATE.',sanctum');

        Route::get('/reports/summary', [CampusController::class, 'summary'])
            ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');

        // Permission Routes
        Route::prefix('permissions')->group(function (): void {
            // The caller's own access map (used by the sidebar for every role).
            Route::get('/modules', [PermissionController::class, 'getModules'])
                ->middleware('permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum');
            Route::get('/all', [PermissionController::class, 'getPermissions'])
                ->middleware('permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum');
            Route::get('/{permission}/check', [PermissionController::class, 'checkPermission'])
                ->middleware('permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum');

            // Role definitions across the system.
            Route::get('/roles/all', [PermissionController::class, 'getAllRoles'])
                ->middleware('permission:'.CampusPermission::ROLES_VIEW.',sanctum');
            Route::get('/roles/{role}', [PermissionController::class, 'getRole'])
                ->middleware('permission:'.CampusPermission::ROLES_VIEW.',sanctum');
        });

        // ============================================
        // ACADEMIC RESULTS & MARK PROCESSING
        // documentation/academic-results-backend-spec.md
        // draft → submitted → verified → approved → locked (published)
        // ============================================
        $marksView = 'permission:'.CampusPermission::MARKS_VIEW.',sanctum';
        $marksCreate = 'permission:'.CampusPermission::MARKS_CREATE.',sanctum';
        $marksApprove = 'permission:'.CampusPermission::MARKS_APPROVE.',sanctum';
        $marksPublish = 'permission:'.CampusPermission::MARKS_PUBLISH.',sanctum';

        // Exams to enter marks against (read-only until exam scheduling is built)
        Route::get('/exams', [ExamController::class, 'index'])->middleware($marksView);

        // Stage 1: grading scale and mark schemes.
        Route::prefix('grade-rules')->group(function () use ($marksView, $marksCreate): void {
            Route::get('/', [GradeRuleController::class, 'index'])->middleware($marksView);
            Route::post('/', [GradeRuleController::class, 'store'])->middleware($marksCreate);
            Route::post('/setup-defaults', [GradeRuleController::class, 'setupDefaults'])->middleware($marksCreate);
            Route::get('/{gradeRule}', [GradeRuleController::class, 'show'])->whereNumber('gradeRule')->middleware($marksView);
            Route::put('/{gradeRule}', [GradeRuleController::class, 'update'])->whereNumber('gradeRule')->middleware($marksCreate);
            Route::delete('/{gradeRule}', [GradeRuleController::class, 'destroy'])->whereNumber('gradeRule')->middleware($marksCreate);
        });

        Route::prefix('mark-schemes')->group(function () use ($marksView, $marksCreate): void {
            Route::get('/', [MarkSchemeController::class, 'index'])->middleware($marksView);
            Route::post('/', [MarkSchemeController::class, 'store'])->middleware($marksCreate);
            Route::get('/{markScheme}', [MarkSchemeController::class, 'show'])->whereNumber('markScheme')->middleware($marksView);
            Route::put('/{markScheme}', [MarkSchemeController::class, 'update'])->whereNumber('markScheme')->middleware($marksCreate);
            Route::delete('/{markScheme}', [MarkSchemeController::class, 'destroy'])->whereNumber('markScheme')->middleware($marksCreate);
        });

        // Stages 2–3: faculty entry and submission.
        Route::prefix('mark-entries')->group(function () use ($marksView, $marksCreate): void {
            Route::get('/', [MarkEntryController::class, 'index'])->middleware($marksView);
            Route::get('/get-students', [MarkEntryController::class, 'students'])->middleware($marksCreate);
            Route::post('/save-draft', [MarkEntryController::class, 'saveDraft'])->middleware($marksCreate);
            Route::post('/submit', [MarkEntryController::class, 'submit'])->middleware($marksCreate);
            Route::get('/{markEntry}', [MarkEntryController::class, 'show'])->whereNumber('markEntry')->middleware($marksView);
        });

        // Stage 4: departmental review.
        Route::prefix('mark-review')->group(function () use ($marksView, $marksApprove): void {
            Route::get('/get-submitted-marks', [MarkReviewController::class, 'queue'])->middleware($marksView);
            Route::get('/exam-summary', [MarkReviewController::class, 'examSummary'])->middleware($marksView);
            Route::post('/bulk-approve', [MarkReviewController::class, 'bulkApprove'])->middleware($marksApprove);
            Route::post('/{markEntry}/verify', [MarkReviewController::class, 'verify'])->whereNumber('markEntry')->middleware($marksApprove);
            Route::post('/{markEntry}/approve', [MarkReviewController::class, 'approve'])->whereNumber('markEntry')->middleware($marksApprove);
            Route::post('/{markEntry}/reject', [MarkReviewController::class, 'reject'])->whereNumber('markEntry')->middleware($marksApprove);
        });

        // Stage 5: semester publishing and locking.
        Route::prefix('result-publishing')->group(function () use ($marksView, $marksPublish): void {
            Route::get('/status', [ResultPublishingController::class, 'status'])->middleware($marksView);
            Route::post('/publish', [ResultPublishingController::class, 'publish'])->middleware($marksPublish);
            Route::post('/unlock', [ResultPublishingController::class, 'unlock'])->middleware($marksPublish);
            Route::get('/logs', [ResultPublishingController::class, 'logs'])->middleware($marksView);
        });

        // Stage 6: a student's own published results, and the derived summary for placement.
        Route::prefix('student/results')->group(function () use ($marksView): void {
            Route::get('/semesters', [StudentResultController::class, 'semesters'])->middleware($marksView);
            Route::get('/semester/{semester}', [StudentResultController::class, 'semester'])->whereNumber('semester')->middleware($marksView);
            Route::get('/all', [StudentResultController::class, 'all'])->middleware($marksView);
        });
        Route::get('/students/{student}/academic-summary', [StudentAcademicsController::class, 'summary'])
            ->whereNumber('student')
            ->middleware('permission:'.CampusPermission::RESULTS_VIEW_SUMMARY.',sanctum');

        // Attendance Routes
        Route::prefix('attendance')->group(function (): void {
            Route::get('/subjects', [AttendanceController::class, 'subjects'])
                ->middleware('permission:attendance.mark,sanctum');
            Route::get('/', [AttendanceController::class, 'index'])
                ->middleware('permission:attendance.view,sanctum');
            Route::post('/mark', [AttendanceController::class, 'markAttendance'])
                ->middleware('permission:attendance.mark,sanctum');
            Route::get('/subject/{subjectId}/students', [AttendanceController::class, 'getStudentsForSubject'])->whereNumber('subjectId')
                ->middleware('permission:attendance.mark,sanctum');
            Route::get('/student/{studentId}/report', [AttendanceController::class, 'getStudentReport'])->whereNumber('studentId')
                ->middleware('permission:attendance.view,sanctum');
            Route::get('/subject/{subjectId}/report', [AttendanceController::class, 'getSubjectReport'])->whereNumber('subjectId')
                ->middleware('permission:attendance.view,sanctum');
            Route::put('/{attendanceId}', [AttendanceController::class, 'update'])->whereNumber('attendanceId')
                ->middleware('permission:attendance.edit,sanctum');
            Route::delete('/{attendanceId}', [AttendanceController::class, 'delete'])->whereNumber('attendanceId')
                ->middleware('permission:attendance.delete,sanctum');
            Route::post('/approve', [AttendanceController::class, 'approveAttendance'])
                ->middleware('permission:attendance.approve,sanctum');
        });

        // Student API Routes
        Route::prefix('student')->group(function (): void {
            // Student Attendance
            Route::prefix('attendance')->group(function (): void {
                Route::get('/', [StudentAttendanceController::class, 'index'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_VIEW.',sanctum');
                Route::get('/detailed', [StudentAttendanceController::class, 'getDetailedRecords'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_VIEW.',sanctum');
                Route::get('/statistics', [StudentAttendanceController::class, 'getStatistics'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_VIEW.',sanctum');
            });

            // Student Marks
            Route::middleware('deprecated:student/results/all')->group(function (): void {
                Route::prefix('marks')->group(function (): void {
                    Route::get('/', [MarksController::class, 'index'])
                        ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
                    Route::get('/statistics', [MarksController::class, 'getStatistics'])
                        ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
                });
            });

            // Student Timetable
            Route::prefix('timetable')->group(function (): void {
                Route::get('/', [TimetableController::class, 'index'])
                    ->middleware('permission:'.CampusPermission::TIMETABLE_VIEW.',sanctum');
                Route::get('/day', [TimetableController::class, 'getByDay'])
                    ->middleware('permission:'.CampusPermission::TIMETABLE_VIEW.',sanctum');
            });

            // Student Materials & Assignments
            Route::prefix('materials')->middleware('sample-data')->group(function (): void {
                Route::get('/', [MaterialsController::class, 'getMaterials'])
                    ->middleware('permission:'.CampusPermission::MATERIALS_VIEW.',sanctum');
            });

            Route::prefix('assignments')->middleware('sample-data')->group(function (): void {
                Route::get('/', [MaterialsController::class, 'getAssignments'])
                    ->middleware('permission:'.CampusPermission::ASSIGNMENTS_VIEW.',sanctum');
                Route::post('/submit', [MaterialsController::class, 'submitAssignment'])
                    ->middleware('permission:'.CampusPermission::ASSIGNMENTS_SUBMIT.',sanctum');
            });

        });

        // Staff Routes
        Route::prefix('staff')->middleware('sample-data')->group(function (): void {
            // Attendance Marking Routes
            Route::prefix('attendance')->group(function (): void {
                Route::get('/students', [StaffAttendanceController::class, 'getStudents'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_MARK.',sanctum');
                Route::post('/submit', [StaffAttendanceController::class, 'submitAttendance'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_MARK.',sanctum');
                Route::get('/history', [StaffAttendanceController::class, 'getHistory'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_VIEW.',sanctum');
                Route::get('/classes', [StaffAttendanceController::class, 'getClasses'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_MARK.',sanctum');
                Route::get('/subjects', [StaffAttendanceController::class, 'getSubjects'])
                    ->middleware('permission:'.CampusPermission::ATTENDANCE_MARK.',sanctum');
            });

            // Marks Entry Routes
            Route::middleware('deprecated:mark-entries')->group(function (): void {
                Route::prefix('marks')->group(function (): void {
                    Route::get('/students', [StaffMarksController::class, 'getStudents'])
                        ->middleware('permission:'.CampusPermission::MARKS_CREATE.',sanctum');
                    Route::post('/submit', [StaffMarksController::class, 'submitMarks'])
                        ->middleware('permission:'.CampusPermission::MARKS_CREATE.',sanctum');
                    Route::get('/exams', [StaffMarksController::class, 'getExams'])
                        ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
                    Route::get('/statistics', [StaffMarksController::class, 'getStatistics'])
                        ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
                    Route::get('/template', [StaffMarksController::class, 'downloadTemplate'])
                        ->middleware('permission:'.CampusPermission::MARKS_CREATE.',sanctum');
                    Route::post('/upload', [StaffMarksController::class, 'uploadMarks'])
                        ->middleware('permission:'.CampusPermission::MARKS_CREATE.',sanctum');
                });
            });

            // Staff Management Routes (HOD)
            Route::prefix('management')->group(function (): void {
                Route::get('/', [StaffManagementController::class, 'getStaff'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
                Route::get('/{staffId}', [StaffManagementController::class, 'getStaffById'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
                Route::post('/', [StaffManagementController::class, 'createStaff'])
                    ->middleware('permission:'.CampusPermission::STAFF_CREATE.',sanctum');
                Route::put('/{staffId}', [StaffManagementController::class, 'updateStaff'])
                    ->middleware('permission:'.CampusPermission::STAFF_EDIT.',sanctum');
                Route::delete('/{staffId}', [StaffManagementController::class, 'deleteStaff'])
                    ->middleware('permission:'.CampusPermission::STAFF_DELETE.',sanctum');
                Route::post('/{staffId}/assign-classes', [StaffManagementController::class, 'assignClasses'])
                    ->middleware('permission:'.CampusPermission::STAFF_EDIT.',sanctum');
                Route::get('/{staffId}/workload', [StaffManagementController::class, 'getWorkload'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
                Route::get('/list/departments', [StaffManagementController::class, 'getDepartments'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
                Route::get('/list/designations', [StaffManagementController::class, 'getDesignations'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
            });

            // Exam Coordinator Routes
            Route::prefix('exam')->group(function (): void {
                Route::get('/', [ExamCoordinatorController::class, 'getExams'])
                    ->middleware('permission:'.CampusPermission::EXAMS_VIEW.',sanctum');
                Route::get('/{examId}', [ExamCoordinatorController::class, 'getExamDetails'])
                    ->middleware('permission:'.CampusPermission::EXAMS_VIEW.',sanctum');
                Route::post('/', [ExamCoordinatorController::class, 'createExam'])
                    ->middleware('permission:'.CampusPermission::EXAMS_CREATE.',sanctum');
                Route::post('/{examId}/assign-invigilators', [ExamCoordinatorController::class, 'assignInvigilators'])
                    ->middleware('permission:'.CampusPermission::EXAMS_EDIT.',sanctum');
                Route::post('/{examId}/assign-classrooms', [ExamCoordinatorController::class, 'assignClassrooms'])
                    ->middleware('permission:'.CampusPermission::EXAMS_EDIT.',sanctum');
                Route::get('/{examId}/progress', [ExamCoordinatorController::class, 'getProgress'])
                    ->middleware('permission:'.CampusPermission::EXAMS_VIEW.',sanctum');
                Route::post('/{examId}/declare-results', [ExamCoordinatorController::class, 'declareResults'])
                    ->middleware('permission:'.CampusPermission::EXAMS_EDIT.',sanctum');
                Route::get('/seating-arrangement', [ExamCoordinatorController::class, 'getSeatingArrangement'])
                    ->middleware('permission:'.CampusPermission::EXAMS_VIEW.',sanctum');
                Route::get('/report', [ExamCoordinatorController::class, 'generateReport'])
                    ->middleware('permission:'.CampusPermission::EXAMS_VIEW.',sanctum');
            });

            // Department Overview Routes (HOD)
            Route::prefix('department')->group(function (): void {
                Route::get('/overview', [StaffDepartmentController::class, 'getOverview'])
                    ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
                Route::get('/staff', [StaffDepartmentController::class, 'getStaff'])
                    ->middleware('permission:'.CampusPermission::STAFF_VIEW.',sanctum');
                Route::get('/classes', [StaffDepartmentController::class, 'getClasses'])
                    ->middleware('permission:'.CampusPermission::CLASSES_VIEW.',sanctum');
                Route::get('/performance', [StaffDepartmentController::class, 'getPerformance'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/budget', [StaffDepartmentController::class, 'getBudget'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/announcements', [StaffDepartmentController::class, 'getAnnouncements'])
                    ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_VIEW.',sanctum');
                Route::get('/infrastructure', [StaffDepartmentController::class, 'getInfrastructure'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
            });

            // Reports & Analytics Routes (HOD)
            Route::prefix('reports')->group(function (): void {
                Route::get('/academic-performance', [ReportsController::class, 'getAcademicPerformance'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/attendance', [ReportsController::class, 'getAttendanceReport'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/placement', [ReportsController::class, 'getPlacementAnalytics'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/research', [ReportsController::class, 'getResearchReport'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::get('/resource-utilization', [ReportsController::class, 'getResourceUtilization'])
                    ->middleware('permission:'.CampusPermission::REPORTS_VIEW.',sanctum');
                Route::post('/generate', [ReportsController::class, 'generateCustomReport'])
                    ->middleware('permission:'.CampusPermission::REPORTS_GENERATE.',sanctum');
            });
        });

        // Placement officer routes on real data (documentation/placement-officer-journey-backend-spec.md).
        // The applications list shows other students' details, so it needs placement.manage.
        Route::prefix('staff/placement')->group(function (): void {
            Route::get('/drives', [PlacementController::class, 'getDrives'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum')
                ->middleware('deprecated:placement/jobs');
            Route::get('/applications', [PlacementController::class, 'getApplications'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum')
                ->middleware('deprecated:placement/jobs');
            Route::post('/drives', [PlacementController::class, 'createDrive'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum')
                ->middleware('deprecated:placement/jobs');
            Route::put('/drives/{driveId}', [PlacementController::class, 'updateDrive'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum')
                ->middleware('deprecated:placement/jobs');
            Route::get('/statistics', [PlacementController::class, 'getStatistics'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
            Route::get('/results-by-batch', [PlacementController::class, 'getResultsByBatch'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW_RESULTS.',sanctum');
            Route::get('/report', [PlacementController::class, 'exportReport'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
        });
    });
});
