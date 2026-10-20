<?php

namespace App\Services;

use Illuminate\Foundation\Auth\User;

class PermissionService
{
    /**
     * Module -> actions -> backing permission names.
     * The frontend reads these keys to decide module visibility.
     */
    private static function modulePermissionMatrix(): array
    {
        return [
            'dashboard' => [
                'view' => ['dashboard.view'],
            ],
            'activity' => [
                'view' => ['activity.view'],
            ],
            'master' => [
                'view' => ['master.view'],
                'create' => ['master.create'],
                'edit' => ['master.edit'],
                'delete' => ['master.delete'],
            ],
            'departments' => [
                'view' => ['departments.view'],
                'create' => ['departments.create'],
                'edit' => ['departments.edit'],
                'delete' => ['departments.delete'],
            ],
            'designations' => [
                'view' => ['designations.view'],
                'create' => ['designations.create'],
                'edit' => ['designations.edit'],
                'delete' => ['designations.delete'],
            ],
            'courses' => [
                'view' => ['courses.view'],
                'create' => ['courses.create'],
                'edit' => ['courses.edit'],
                'delete' => ['courses.delete'],
            ],
            'subjects' => [
                'view' => ['subjects.view'],
                'create' => ['subjects.create'],
                'edit' => ['subjects.edit'],
                'delete' => ['subjects.delete'],
            ],
            'academic_years' => [
                'view' => ['academic_years.view'],
                'create' => ['academic_years.create'],
                'edit' => ['academic_years.edit'],
                'delete' => ['academic_years.delete'],
            ],
            'students' => [
                'view' => ['students.view'],
                'create' => ['students.create'],
                'edit' => ['students.edit'],
                'delete' => ['students.delete'],
                'view_all' => ['students.view_all'],
            ],
            'staff' => [
                'view' => ['staff.view'],
                'create' => ['staff.create'],
                'edit' => ['staff.edit'],
                'delete' => ['staff.delete'],
                'view_all' => ['staff.view_all'],
            ],
            'users' => [
                'view' => ['users.view'],
                'create' => ['users.create'],
                'edit' => ['users.edit'],
                'delete' => ['users.delete'],
            ],
            'roles' => [
                'view' => ['roles.view'],
                'create' => ['roles.create'],
                'edit' => ['roles.edit'],
                'delete' => ['roles.delete'],
            ],
            'permissions' => [
                'view' => ['permissions.view'],
                'create' => ['permissions.create'],
                'edit' => ['permissions.edit'],
                'delete' => ['permissions.delete'],
            ],
            'attendance' => [
                'view' => ['attendance.view'],
                'mark' => ['attendance.mark'],
                'approve' => ['attendance.approve'],
                'edit' => ['attendance.edit'],
                'delete' => ['attendance.delete'],
            ],
            'exams' => [
                'view' => ['exams.view'],
                'create' => ['exams.create'],
                'edit' => ['exams.edit'],
                'delete' => ['exams.delete'],
            ],
            'marks' => [
                'view' => ['marks.view'],
                'create' => ['marks.create'],
                'edit' => ['marks.edit'],
                'delete' => ['marks.delete'],
                'publish' => ['marks.publish'],
            ],
            'timetable' => [
                'view' => ['timetable.view'],
                'create' => ['timetable.create'],
                'edit' => ['timetable.edit'],
                'delete' => ['timetable.delete'],
            ],
            'classes' => [
                'view' => ['classes.view'],
                'create' => ['classes.create'],
                'edit' => ['classes.edit'],
                'delete' => ['classes.delete'],
            ],
            'fees' => [
                // Dedicated fee permissions do not exist yet in CampusPermission.
                // Reuse reports permission to keep module visible to admin/authorized users.
                'view' => ['reports.view'],
            ],
            'companies' => [
                'view' => ['companies.view'],
                'create' => ['companies.create'],
                'edit' => ['companies.edit'],
                'delete' => ['companies.delete'],
            ],
            'job_drives' => [
                // Reuse placement permissions to represent drives module.
                'view' => ['placement.view'],
                'manage' => ['placement.manage', 'placement.create'],
            ],
            'placement' => [
                'view' => ['placement.view'],
                'apply' => ['placement.apply'],
                'manage' => ['placement.manage', 'placement.create'],
                'schedule_round' => ['placement.schedule_round'],
                'view_results' => ['placement.view_results'],
                'publish_results' => ['placement.publish_results'],
            ],
            'announcements' => [
                'view' => ['announcements.view'],
                'create' => ['announcements.create'],
                'edit' => ['announcements.edit'],
                'delete' => ['announcements.delete'],
            ],
            'notifications' => [
                'view' => ['notifications.view'],
                'manage' => ['notifications.manage'],
            ],
            'reports' => [
                'view' => ['reports.view'],
                'generate' => ['reports.generate'],
            ],
            'profile' => [
                'view' => ['profile.view'],
            ],
            'settings' => [
                'view' => ['settings.view'],
                'manage' => ['settings.manage'],
            ],
        ];
    }

    /**
     * Get all modules accessible by the user based on their permissions
     */
    public static function getUserModules(User $user): array
    {
        $matrix = self::modulePermissionMatrix();

        // Admin must always see all modules.
        if ($user->isAdmin()) {
            return array_keys($matrix);
        }

        $accessibleModules = [];

        foreach ($matrix as $module => $actions) {
            foreach ($actions as $permissionNames) {
                $granted = collect($permissionNames)->contains(function (string $permissionName) use ($user): bool {
                    return $user->hasPermissionTo($permissionName, 'sanctum');
                });

                if ($granted) {
                    $accessibleModules[] = $module;
                    break;
                }
            }
        }

        return $accessibleModules;
    }

    /**
     * Get detailed permissions for all modules
     */
    public static function getModuleActions(User $user): array
    {
        $matrix = self::modulePermissionMatrix();

        // Admin must always see all module actions as allowed in the UI layer.
        if ($user->isAdmin()) {
            return collect($matrix)
                ->map(fn (array $actions) => collect($actions)
                    ->map(fn () => true)
                    ->toArray())
                ->toArray();
        }

        return collect($matrix)
            ->map(function (array $actions) use ($user): array {
                return collect($actions)
                    ->map(function (array $permissionNames) use ($user): bool {
                        return collect($permissionNames)->contains(function (string $permissionName) use ($user): bool {
                            return $user->hasPermissionTo($permissionName, 'sanctum');
                        });
                    })
                    ->toArray();
            })
            ->toArray();
    }

    /**
     * Get role name for user display
     */
    public static function getUserRoleLabel(User $user): string
    {
        $roleNames = [
            'super_admin' => 'Super Admin',
            'institution_admin' => 'Institution Admin',
            'placement_officer' => 'Placement Officer',
            'staff' => 'Staff',
            'student' => 'Student',
            'recruiter' => 'Recruiter',
        ];

        $role = $user->role;
        return $roleNames[$role] ?? $role;
    }
}
