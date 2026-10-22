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
use App\Http\Controllers\Api\Student\NotificationsController;
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
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DesignationController;
use App\Http\Controllers\Api\V1\GradeRuleController;
use App\Http\Controllers\Api\V1\Interviews\InterviewController;
use App\Http\Controllers\Api\V1\BatchController;
use App\Http\Controllers\Api\V1\CampusSiteController;
use App\Http\Controllers\Api\V1\InstitutionSettingsController;
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
            ->middleware('permission:'.CampusPermission::PROFILE_VIEW.',sanctum');
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
            Route::get('/subject/{subjectId}/students', [AttendanceController::class, 'getStudentsForSubject'])
                ->middleware('permission:attendance.mark,sanctum');
            Route::get('/student/{studentId}/report', [AttendanceController::class, 'getStudentReport'])
                ->middleware('permission:attendance.view,sanctum');
            Route::get('/subject/{subjectId}/report', [AttendanceController::class, 'getSubjectReport'])
                ->middleware('permission:attendance.view,sanctum');
            Route::put('/{attendanceId}', [AttendanceController::class, 'update'])
                ->middleware('permission:attendance.edit,sanctum');
            Route::delete('/{attendanceId}', [AttendanceController::class, 'delete'])
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
            Route::prefix('marks')->group(function (): void {
                Route::get('/', [MarksController::class, 'index'])
                    ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
                Route::get('/statistics', [MarksController::class, 'getStatistics'])
                    ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
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

            // Student Notifications
            Route::prefix('notifications')->middleware('sample-data')->group(function (): void {
                Route::get('/', [NotificationsController::class, 'index'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_VIEW.',sanctum');
                Route::post('/mark-as-read', [NotificationsController::class, 'markAsRead'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_VIEW.',sanctum');
                Route::post('/mark-all-as-read', [NotificationsController::class, 'markAllAsRead'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_VIEW.',sanctum');
                Route::delete('/delete', [NotificationsController::class, 'delete'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_VIEW.',sanctum');
                Route::delete('/delete-all', [NotificationsController::class, 'deleteAll'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_VIEW.',sanctum');
                Route::get('/preferences', [NotificationsController::class, 'getPreferences'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_MANAGE.',sanctum');
                Route::put('/preferences', [NotificationsController::class, 'updatePreferences'])
                    ->middleware('permission:'.CampusPermission::NOTIFICATIONS_MANAGE.',sanctum');
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
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
            Route::get('/applications', [PlacementController::class, 'getApplications'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
            Route::post('/drives', [PlacementController::class, 'createDrive'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
            Route::put('/drives/{driveId}', [PlacementController::class, 'updateDrive'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
            Route::get('/statistics', [PlacementController::class, 'getStatistics'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
            Route::get('/results-by-batch', [PlacementController::class, 'getResultsByBatch'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW_RESULTS.',sanctum');
            Route::get('/report', [PlacementController::class, 'exportReport'])
                ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
        });
    });
});
