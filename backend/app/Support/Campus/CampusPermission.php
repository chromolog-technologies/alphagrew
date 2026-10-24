<?php

namespace App\Support\Campus;

use App\Enums\UserRole;
final class CampusPermission
{
    // Dashboard & Core
    public const DASHBOARD_VIEW = 'dashboard.view';
    public const PROFILE_VIEW = 'profile.view';
    public const PROFILE_EDIT = 'profile.edit';
    public const DEMO_RESET = 'demo.reset';

    // Master Data Management
    public const MASTER_VIEW = 'master.view';
    public const MASTER_CREATE = 'master.create';
    public const MASTER_EDIT = 'master.edit';
    public const MASTER_DELETE = 'master.delete';

    // Students Management
    public const STUDENTS_VIEW = 'students.view';
    public const STUDENTS_CREATE = 'students.create';
    public const STUDENTS_EDIT = 'students.edit';
    public const STUDENTS_DELETE = 'students.delete';
    public const STUDENTS_VIEW_ALL = 'students.view_all';

    // Staff Management
    public const STAFF_VIEW = 'staff.view';
    public const STAFF_CREATE = 'staff.create';
    public const STAFF_EDIT = 'staff.edit';
    public const STAFF_DELETE = 'staff.delete';
    public const STAFF_VIEW_ALL = 'staff.view_all';

    // Departments
    public const DEPARTMENTS_VIEW = 'departments.view';
    public const DEPARTMENTS_CREATE = 'departments.create';
    public const DEPARTMENTS_EDIT = 'departments.edit';
    public const DEPARTMENTS_DELETE = 'departments.delete';

    // Designations & RBAC
    public const DESIGNATIONS_VIEW = 'designations.view';
    public const DESIGNATIONS_CREATE = 'designations.create';
    public const DESIGNATIONS_EDIT = 'designations.edit';
    public const DESIGNATIONS_DELETE = 'designations.delete';

    // Courses & Subjects
    public const COURSES_VIEW = 'courses.view';
    public const COURSES_CREATE = 'courses.create';
    public const COURSES_EDIT = 'courses.edit';
    public const COURSES_DELETE = 'courses.delete';

    public const SUBJECTS_VIEW = 'subjects.view';
    public const SUBJECTS_CREATE = 'subjects.create';
    public const SUBJECTS_EDIT = 'subjects.edit';
    public const SUBJECTS_DELETE = 'subjects.delete';

    // Academic Years & Semesters
    public const ACADEMIC_YEARS_VIEW = 'academic_years.view';
    public const ACADEMIC_YEARS_CREATE = 'academic_years.create';
    public const ACADEMIC_YEARS_EDIT = 'academic_years.edit';
    public const ACADEMIC_YEARS_DELETE = 'academic_years.delete';

    // Attendance Management
    public const ATTENDANCE_VIEW = 'attendance.view';
    public const ATTENDANCE_MARK = 'attendance.mark';
    public const ATTENDANCE_EDIT = 'attendance.edit';
    public const ATTENDANCE_DELETE = 'attendance.delete';
    public const ATTENDANCE_APPROVE = 'attendance.approve';

    // Exams Management
    public const EXAMS_VIEW = 'exams.view';
    public const EXAMS_CREATE = 'exams.create';
    public const EXAMS_EDIT = 'exams.edit';
    public const EXAMS_DELETE = 'exams.delete';

    // Marks Management
    public const MARKS_VIEW = 'marks.view';
    public const MARKS_CREATE = 'marks.create';
    public const MARKS_EDIT = 'marks.edit';
    public const MARKS_DELETE = 'marks.delete';
    public const MARKS_PUBLISH = 'marks.publish';
    // Verify / approve / reject submitted marks. Granted through the HOD (own department)
    // and Exam Coordinator (whole institution) designations, never the base staff role.
    public const MARKS_APPROVE = 'marks.approve';

    // Results: a student's derived CGPA / backlog summary, for placement eligibility.
    public const RESULTS_VIEW_SUMMARY = 'results.view_summary';

    // AI Interview Journey: a student's own resumes and mock interviews.
    public const RESUMES_MANAGE = 'resumes.manage';
    public const INTERVIEWS_PRACTICE = 'interviews.practice';

    // Timetable Management
    public const TIMETABLE_VIEW = 'timetable.view';
    public const TIMETABLE_CREATE = 'timetable.create';
    public const TIMETABLE_EDIT = 'timetable.edit';
    public const TIMETABLE_DELETE = 'timetable.delete';

    // Classes Management
    public const CLASSES_VIEW = 'classes.view';
    public const CLASSES_CREATE = 'classes.create';
    public const CLASSES_EDIT = 'classes.edit';
    public const CLASSES_DELETE = 'classes.delete';

    // Companies & Placements
    public const COMPANIES_VIEW = 'companies.view';
    public const COMPANIES_CREATE = 'companies.create';
    public const COMPANIES_EDIT = 'companies.edit';
    public const COMPANIES_DELETE = 'companies.delete';

    public const PLACEMENT_VIEW = 'placement.view';
    public const PLACEMENT_APPLY = 'placement.apply';
    public const PLACEMENT_CREATE = 'placement.create';
    public const PLACEMENT_MANAGE = 'placement.manage';
    public const PLACEMENT_SCHEDULE_ROUND = 'placement.schedule_round';
    public const PLACEMENT_VIEW_RESULTS = 'placement.view_results';
    public const PLACEMENT_PUBLISH_RESULTS = 'placement.publish_results';

    // Announcements
    public const ANNOUNCEMENTS_VIEW = 'announcements.view';
    public const ANNOUNCEMENTS_CREATE = 'announcements.create';
    public const ANNOUNCEMENTS_EDIT = 'announcements.edit';
    public const ANNOUNCEMENTS_DELETE = 'announcements.delete';

    // Activity & Audit
    public const ACTIVITY_VIEW = 'activity.view';

    // Roles & Permissions Management
    public const ROLES_VIEW = 'roles.view';
    public const ROLES_CREATE = 'roles.create';
    public const ROLES_EDIT = 'roles.edit';
    public const ROLES_DELETE = 'roles.delete';

    public const PERMISSIONS_VIEW = 'permissions.view';
    public const PERMISSIONS_CREATE = 'permissions.create';
    public const PERMISSIONS_EDIT = 'permissions.edit';
    public const PERMISSIONS_DELETE = 'permissions.delete';

    // Reports & Analytics
    public const REPORTS_VIEW = 'reports.view';
    public const REPORTS_GENERATE = 'reports.generate';

    // User Account Management
    public const USERS_VIEW = 'users.view';
    public const USERS_CREATE = 'users.create';
    public const USERS_EDIT = 'users.edit';
    public const USERS_DELETE = 'users.delete';

    // Notifications
    public const NOTIFICATIONS_VIEW = 'notifications.view';
    public const NOTIFICATIONS_MANAGE = 'notifications.manage';

    // Materials & Assignments
    public const MATERIALS_VIEW = 'materials.view';
    public const ASSIGNMENTS_VIEW = 'assignments.view';
    public const ASSIGNMENTS_SUBMIT = 'assignments.submit';

    // Settings
    public const SETTINGS_VIEW = 'settings.view';
    public const SETTINGS_MANAGE = 'settings.manage';

    public static function all(): array
    {
        return [
            // Dashboard & Core
            self::DASHBOARD_VIEW,
            self::PROFILE_VIEW,
            self::PROFILE_EDIT,
            self::DEMO_RESET,

            // Master Data
            self::MASTER_VIEW,
            self::MASTER_CREATE,
            self::MASTER_EDIT,
            self::MASTER_DELETE,

            // Students
            self::STUDENTS_VIEW,
            self::STUDENTS_CREATE,
            self::STUDENTS_EDIT,
            self::STUDENTS_DELETE,
            self::STUDENTS_VIEW_ALL,

            // Staff
            self::STAFF_VIEW,
            self::STAFF_CREATE,
            self::STAFF_EDIT,
            self::STAFF_DELETE,
            self::STAFF_VIEW_ALL,

            // Departments
            self::DEPARTMENTS_VIEW,
            self::DEPARTMENTS_CREATE,
            self::DEPARTMENTS_EDIT,
            self::DEPARTMENTS_DELETE,

            // Designations
            self::DESIGNATIONS_VIEW,
            self::DESIGNATIONS_CREATE,
            self::DESIGNATIONS_EDIT,
            self::DESIGNATIONS_DELETE,

            // Courses
            self::COURSES_VIEW,
            self::COURSES_CREATE,
            self::COURSES_EDIT,
            self::COURSES_DELETE,

            // Subjects
            self::SUBJECTS_VIEW,
            self::SUBJECTS_CREATE,
            self::SUBJECTS_EDIT,
            self::SUBJECTS_DELETE,

            // Academic Years
            self::ACADEMIC_YEARS_VIEW,
            self::ACADEMIC_YEARS_CREATE,
            self::ACADEMIC_YEARS_EDIT,
            self::ACADEMIC_YEARS_DELETE,

            // Attendance
            self::ATTENDANCE_VIEW,
            self::ATTENDANCE_MARK,
            self::ATTENDANCE_EDIT,
            self::ATTENDANCE_DELETE,
            self::ATTENDANCE_APPROVE,

            // Exams
            self::EXAMS_VIEW,
            self::EXAMS_CREATE,
            self::EXAMS_EDIT,
            self::EXAMS_DELETE,

            // Marks
            self::MARKS_VIEW,
            self::MARKS_CREATE,
            self::MARKS_EDIT,
            self::MARKS_DELETE,
            self::MARKS_PUBLISH,
            self::MARKS_APPROVE,

            // Results
            self::RESULTS_VIEW_SUMMARY,

            // AI Interview Journey
            self::RESUMES_MANAGE,
            self::INTERVIEWS_PRACTICE,

            // Timetable
            self::TIMETABLE_VIEW,
            self::TIMETABLE_CREATE,
            self::TIMETABLE_EDIT,
            self::TIMETABLE_DELETE,

            // Classes
            self::CLASSES_VIEW,
            self::CLASSES_CREATE,
            self::CLASSES_EDIT,
            self::CLASSES_DELETE,

            // Companies
            self::COMPANIES_VIEW,
            self::COMPANIES_CREATE,
            self::COMPANIES_EDIT,
            self::COMPANIES_DELETE,

            // Placement
            self::PLACEMENT_VIEW,
            self::PLACEMENT_APPLY,
            self::PLACEMENT_CREATE,
            self::PLACEMENT_MANAGE,
            self::PLACEMENT_SCHEDULE_ROUND,
            self::PLACEMENT_VIEW_RESULTS,
            self::PLACEMENT_PUBLISH_RESULTS,

            // Announcements
            self::ANNOUNCEMENTS_VIEW,
            self::ANNOUNCEMENTS_CREATE,
            self::ANNOUNCEMENTS_EDIT,
            self::ANNOUNCEMENTS_DELETE,

            // Activity
            self::ACTIVITY_VIEW,

            // Roles
            self::ROLES_VIEW,
            self::ROLES_CREATE,
            self::ROLES_EDIT,
            self::ROLES_DELETE,

            // Permissions
            self::PERMISSIONS_VIEW,
            self::PERMISSIONS_CREATE,
            self::PERMISSIONS_EDIT,
            self::PERMISSIONS_DELETE,

            // Reports
            self::REPORTS_VIEW,
            self::REPORTS_GENERATE,

            // Users
            self::USERS_VIEW,
            self::USERS_CREATE,
            self::USERS_EDIT,
            self::USERS_DELETE,

            // Notifications
            self::NOTIFICATIONS_VIEW,
            self::NOTIFICATIONS_MANAGE,

            // Materials
            self::MATERIALS_VIEW,
            self::ASSIGNMENTS_VIEW,
            self::ASSIGNMENTS_SUBMIT,

            // Settings
            self::SETTINGS_VIEW,
            self::SETTINGS_MANAGE,
        ];
    }

    /**
     * Base permissions per role (see CampusRole). Staff and Placement Officers also
     * receive their designation's permissions on top of these.
     */
    public static function byRole(): array
    {
        return [
            UserRole::SuperAdmin->value => self::all(),
            UserRole::InstitutionAdmin->value => self::all(),
            UserRole::PlacementOfficer->value => [
                self::DASHBOARD_VIEW,
                self::PROFILE_VIEW,
                self::STUDENTS_VIEW,
                self::STUDENTS_VIEW_ALL,
                self::RESULTS_VIEW_SUMMARY,
                self::DEPARTMENTS_VIEW,
                self::COURSES_VIEW,
                self::COMPANIES_VIEW,
                self::COMPANIES_CREATE,
                self::COMPANIES_EDIT,
                self::COMPANIES_DELETE,
                self::PLACEMENT_VIEW,
                self::PLACEMENT_CREATE,
                self::PLACEMENT_MANAGE,
                self::PLACEMENT_SCHEDULE_ROUND,
                self::PLACEMENT_VIEW_RESULTS,
                self::PLACEMENT_PUBLISH_RESULTS,
                self::ANNOUNCEMENTS_VIEW,
                self::ANNOUNCEMENTS_CREATE,
                self::REPORTS_VIEW,
            ],
            // External role; its portal and candidate sharing arrive with the Recruiter Portal phase.
            UserRole::Recruiter->value => [
                self::DASHBOARD_VIEW,
                self::PROFILE_VIEW,
            ],
            UserRole::Staff->value => [
                self::DASHBOARD_VIEW,
                self::PROFILE_VIEW,
                self::ATTENDANCE_VIEW,
                self::ATTENDANCE_MARK,
                self::MARKS_VIEW,
                self::MARKS_CREATE,
                self::MARKS_EDIT,
                self::TIMETABLE_VIEW,
                self::CLASSES_VIEW,
                self::STUDENTS_VIEW,
                self::COURSES_VIEW,
            ],
            UserRole::Student->value => CampusStudentAccess::defaultPermissions(),
        ];
    }

    /**
     * Effective permissions for a role plus an optional designation's permissions.
     */
    public static function forRole(?string $role, array $designationPermissions = []): array
    {
        $base = self::byRole()[$role] ?? [];

        if (! (UserRole::tryFrom((string) $role)?->isInstitutionStaff() ?? false)) {
            return $base;
        }

        return CampusStaffAccess::normalize(array_merge($base, $designationPermissions));
    }
}
