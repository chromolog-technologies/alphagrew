<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CampusController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\SemesterController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DesignationController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Api\Student\AttendanceController as StudentAttendanceController;
use App\Http\Controllers\Api\Student\MarksController;
use App\Http\Controllers\Api\Student\TimetableController;
use App\Http\Controllers\Api\Student\MaterialsController;
use App\Http\Controllers\Api\Student\NotificationsController;
use App\Http\Controllers\Api\Staff\AttendanceController as StaffAttendanceController;
use App\Http\Controllers\Api\Staff\MarksController as StaffMarksController;
use App\Http\Controllers\Api\Staff\StaffManagementController;
use App\Http\Controllers\Api\Staff\PlacementController;
use App\Http\Controllers\Api\Staff\ExamCoordinatorController;
use App\Http\Controllers\Api\Staff\DepartmentController as StaffDepartmentController;
use App\Http\Controllers\Api\Staff\ReportsController;
use App\Support\Campus\CampusPermission;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

        Route::get('/campus/bootstrap', [CampusController::class, 'bootstrap'])
            ->middleware('permission:'.CampusPermission::DASHBOARD_VIEW.',sanctum');
        Route::post('/campus/reset', [CampusController::class, 'reset'])
            ->middleware('permission:'.CampusPermission::DEMO_RESET.',sanctum');

        Route::get('/masters', [CampusController::class, 'masters'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::post('/masters', [CampusController::class, 'storeMaster'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/masters/{master}', [CampusController::class, 'updateMaster'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/masters/{master}', [CampusController::class, 'destroyMaster'])
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


        Route::get('/students', [CampusController::class, 'students'])
            ->middleware('permission:'.CampusPermission::STUDENTS_VIEW.',sanctum');
        Route::put('/students/me/resume', [CampusController::class, 'updateMyResume'])
            ->middleware('permission:'.CampusPermission::PROFILE_VIEW.',sanctum');
        Route::post('/students', [CampusController::class, 'storeStudent'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');
        Route::put('/students/{student}', [CampusController::class, 'updateStudent'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');
        Route::delete('/students/{student}', [CampusController::class, 'destroyStudent'])
            ->middleware('permission:'.CampusPermission::STUDENTS_CREATE.',sanctum');

        Route::get('/staff', [CampusController::class, 'staff'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_VIEW.',sanctum');
        Route::post('/staff', [CampusController::class, 'storeStaff'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::put('/staff/{staff}', [CampusController::class, 'updateStaff'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');
        Route::delete('/staff/{staff}', [CampusController::class, 'destroyStaff'])
            ->middleware('permission:'.CampusPermission::DEPARTMENTS_CREATE.',sanctum');

        Route::get('/companies', [CampusController::class, 'companies'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW.',sanctum');
        Route::post('/companies', [CampusController::class, 'storeCompany'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
        Route::put('/companies/{company}', [CampusController::class, 'updateCompany'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
        Route::delete('/companies/{company}', [CampusController::class, 'destroyCompany'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_CREATE.',sanctum');
        Route::post('/companies/{company}/apply', [CampusController::class, 'applyToCompany'])
            ->middleware('permission:'.CampusPermission::PLACEMENT_APPLY.',sanctum');

        Route::get('/announcements', [CampusController::class, 'announcements'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_VIEW.',sanctum');
        Route::post('/announcements', [CampusController::class, 'storeAnnouncement'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_CREATE.',sanctum');
        Route::put('/announcements/{announcement}', [CampusController::class, 'updateAnnouncement'])
            ->middleware('permission:'.CampusPermission::ANNOUNCEMENTS_CREATE.',sanctum');
        Route::delete('/announcements/{announcement}', [CampusController::class, 'destroyAnnouncement'])
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
        // MARKS MANAGEMENT SYSTEM ROUTES
        // ============================================

        // 1. MASTER SETUP (Admin Phase)
        // Grade Rules - Configure A+, A, B, etc.
        Route::prefix('grade-rules')->group(function (): void {
            Route::get('/', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'index'])
                ->middleware('permission:marks.view,sanctum');
            Route::post('/', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'store'])
                ->middleware('permission:marks.create,sanctum');
            Route::get('/{rule}', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'show'])
                ->middleware('permission:marks.view,sanctum');
            Route::put('/{rule}', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'update'])
                ->middleware('permission:marks.create,sanctum');
            Route::delete('/{rule}', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'destroy'])
                ->middleware('permission:marks.create,sanctum');
            Route::post('/setup-defaults', [\App\Http\Controllers\Api\V1\GradeRuleController::class, 'setupDefaults'])
                ->middleware('permission:marks.create,sanctum');
        });

        // Mark Schemes - Internal/External/Total marks per subject
        Route::prefix('mark-schemes')->group(function (): void {
            Route::get('/', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'index'])
                ->middleware('permission:marks.view,sanctum');
            Route::post('/', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'store'])
                ->middleware('permission:marks.create,sanctum');
            Route::get('/{scheme}', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'show'])
                ->middleware('permission:marks.view,sanctum');
            Route::put('/{scheme}', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'update'])
                ->middleware('permission:marks.create,sanctum');
            Route::delete('/{scheme}', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'destroy'])
                ->middleware('permission:marks.create,sanctum');
            Route::get('/semester/{semesterId}/subjects', [\App\Http\Controllers\Api\V1\MarkSchemeController::class, 'getSubjectsBySemet'])
                ->middleware('permission:marks.view,sanctum');
        });

        // 2. MARK ENTRY (Teacher Phase)
        Route::prefix('mark-entries')->group(function (): void {
            Route::get('/', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'index'])
                ->middleware('permission:marks.view,sanctum');
            Route::post('/', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'store'])
                ->middleware('permission:marks.create,sanctum');
            Route::get('/{entry}', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'show'])
                ->middleware('permission:marks.view,sanctum');
            Route::post('/get-students', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'getStudentsForEntry'])
                ->middleware('permission:marks.create,sanctum');
            Route::post('/save-draft', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'saveDraft'])
                ->middleware('permission:marks.create,sanctum');
            Route::post('/submit', [\App\Http\Controllers\Api\V1\MarkEntryController::class, 'submitMarks'])
                ->middleware('permission:marks.create,sanctum');
        });

        // 3. REVIEW & VERIFICATION (HOD/Admin Phase)
        Route::prefix('mark-review')->group(function (): void {
            Route::get('/submitted', [\App\Http\Controllers\Api\V1\MarkReviewController::class, 'getSubmittedMarks'])
                ->middleware('permission:marks.approve,sanctum');
            Route::post('/{entry}/verify', [\App\Http\Controllers\Api\V1\MarkReviewController::class, 'verify'])
                ->middleware('permission:marks.approve,sanctum');
            Route::post('/{entry}/reject', [\App\Http\Controllers\Api\V1\MarkReviewController::class, 'reject'])
                ->middleware('permission:marks.approve,sanctum');
            Route::post('/{entry}/approve', [\App\Http\Controllers\Api\V1\MarkReviewController::class, 'approve'])
                ->middleware('permission:marks.approve,sanctum');
            Route::post('/exam-summary', [\App\Http\Controllers\Api\V1\MarkReviewController::class, 'getExamSummary'])
                ->middleware('permission:marks.view,sanctum');
        });

        // 4-5. RESULT PUBLISHING & LOCKING (Admin Phase)
        Route::prefix('result-publishing')->group(function (): void {
            Route::get('/status', [\App\Http\Controllers\Api\V1\ResultPublishingController::class, 'getPublishingStatus'])
                ->middleware('permission:marks.view,sanctum');
            Route::post('/publish', [\App\Http\Controllers\Api\V1\ResultPublishingController::class, 'publishResults'])
                ->middleware('permission:marks.publish,sanctum');
            Route::post('/unlock', [\App\Http\Controllers\Api\V1\ResultPublishingController::class, 'unlockResults'])
                ->middleware('permission:marks.publish,sanctum');
            Route::get('/logs', [\App\Http\Controllers\Api\V1\ResultPublishingController::class, 'getPublishingLogs'])
                ->middleware('permission:marks.view,sanctum');
        });

        // 6. STUDENT VIEW FLOW (Student Phase)
        Route::prefix('student/results')->group(function (): void {
            Route::get('/semesters', [\App\Http\Controllers\Api\Student\StudentResultController::class, 'getPublishedSemesters'])
                ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
            Route::get('/semester/{semesterId}', [\App\Http\Controllers\Api\Student\StudentResultController::class, 'getSemesterResult'])
                ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
            Route::get('/all', [\App\Http\Controllers\Api\Student\StudentResultController::class, 'getAllResults'])
                ->middleware('permission:'.CampusPermission::MARKS_VIEW.',sanctum');
        });


        // Attendance Routes
        Route::prefix('attendance')->group(function (): void {
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

            // Placement Routes
            Route::prefix('placement')->group(function (): void {
                Route::get('/drives', [PlacementController::class, 'getDrives'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
                Route::get('/applications', [PlacementController::class, 'getApplications'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
                Route::post('/drives', [PlacementController::class, 'createDrive'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
                Route::put('/drives/{driveId}', [PlacementController::class, 'updateDrive'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
                Route::get('/statistics', [PlacementController::class, 'getStatistics'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
                Route::get('/results-by-batch', [PlacementController::class, 'getResultsByBatch'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_VIEW_RESULTS.',sanctum');
                Route::get('/report', [PlacementController::class, 'exportReport'])
                    ->middleware('permission:'.CampusPermission::PLACEMENT_MANAGE.',sanctum');
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
    });
});
