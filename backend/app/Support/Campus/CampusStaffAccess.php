<?php

namespace App\Support\Campus;

final class CampusStaffAccess
{
    public static function basePermissions(): array
    {
        return [
            CampusPermission::DASHBOARD_VIEW,
            CampusPermission::PROFILE_VIEW,
        ];
    }

    public static function assignablePermissions(): array
    {
        return [
            CampusPermission::STUDENTS_VIEW,
            CampusPermission::STUDENTS_CREATE,
            CampusPermission::DEPARTMENTS_VIEW,
            CampusPermission::DEPARTMENTS_CREATE,
            CampusPermission::PLACEMENT_VIEW,
            CampusPermission::PLACEMENT_CREATE,
            CampusPermission::ANNOUNCEMENTS_VIEW,
            CampusPermission::ANNOUNCEMENTS_CREATE,
            CampusPermission::REPORTS_VIEW,
            CampusPermission::MARKS_VIEW,
            CampusPermission::MARKS_CREATE,
            CampusPermission::MARKS_APPROVE,
            CampusPermission::MARKS_PUBLISH,
        ];
    }

    public static function presets(): array
    {
        return [
            'department_coordinator' => [
                'title' => 'Department Coordinator',
                'description' => 'Students, placement, announcements, and reports for a department-facing staff member.',
                'permissions' => [
                    CampusPermission::STUDENTS_VIEW,
                    CampusPermission::STUDENTS_CREATE,
                    CampusPermission::PLACEMENT_VIEW,
                    CampusPermission::PLACEMENT_CREATE,
                    CampusPermission::ANNOUNCEMENTS_VIEW,
                    CampusPermission::ANNOUNCEMENTS_CREATE,
                    CampusPermission::REPORTS_VIEW,
                ],
            ],
            'hr' => [
                'title' => 'HR',
                'description' => 'Placement-heavy access for interview planning, company updates, and student tracking.',
                'permissions' => [
                    CampusPermission::STUDENTS_VIEW,
                    CampusPermission::PLACEMENT_VIEW,
                    CampusPermission::PLACEMENT_CREATE,
                    CampusPermission::ANNOUNCEMENTS_VIEW,
                    CampusPermission::ANNOUNCEMENTS_CREATE,
                    CampusPermission::REPORTS_VIEW,
                ],
            ],
            'head_of_department' => [
                'title' => 'Head of Department',
                'description' => 'Department leadership: verifies and approves marks for the department\'s subjects.',
                'permissions' => [
                    CampusPermission::STUDENTS_VIEW,
                    CampusPermission::DEPARTMENTS_VIEW,
                    CampusPermission::MARKS_VIEW,
                    CampusPermission::MARKS_CREATE,
                    CampusPermission::MARKS_APPROVE,
                    CampusPermission::ANNOUNCEMENTS_VIEW,
                    CampusPermission::REPORTS_VIEW,
                ],
            ],
            'exam_coordinator' => [
                'title' => 'Exam Coordinator',
                'description' => 'Runs the marks lifecycle institution-wide: grade rules, approvals and result publishing.',
                'permissions' => [
                    CampusPermission::STUDENTS_VIEW,
                    CampusPermission::DEPARTMENTS_VIEW,
                    CampusPermission::MARKS_VIEW,
                    CampusPermission::MARKS_CREATE,
                    CampusPermission::MARKS_APPROVE,
                    CampusPermission::MARKS_PUBLISH,
                    CampusPermission::ANNOUNCEMENTS_VIEW,
                    CampusPermission::ANNOUNCEMENTS_CREATE,
                    CampusPermission::REPORTS_VIEW,
                ],
            ],
            'efc' => [
                'title' => 'EFC',
                'description' => 'Fee and compliance follow-up through student records, departments, and reports.',
                'permissions' => [
                    CampusPermission::STUDENTS_VIEW,
                    CampusPermission::DEPARTMENTS_VIEW,
                    CampusPermission::REPORTS_VIEW,
                    CampusPermission::ANNOUNCEMENTS_VIEW,
                ],
            ],
        ];
    }

    public static function designationSeeds(): array
    {
        return collect(self::presets())
            ->map(fn (array $preset, string $slug) => [
                'slug' => $slug,
                'name' => $preset['title'],
                'description' => $preset['description'] ?? null,
                'permissions' => self::normalize($preset['permissions'] ?? []),
            ])
            ->values()
            ->all();
    }

    public static function normalize($permissions): array
    {
        // Convert Collection to array if needed
        if (is_object($permissions) && method_exists($permissions, 'toArray')) {
            $permissions = $permissions->toArray();
        }
        
        // Ensure permissions is an array
        if (!is_array($permissions)) {
            $permissions = [];
        }

        $impliedPermissions = [];

        if (in_array(CampusPermission::STUDENTS_CREATE, $permissions, true)) {
            $impliedPermissions[] = CampusPermission::STUDENTS_VIEW;
        }
        if (in_array(CampusPermission::DEPARTMENTS_CREATE, $permissions, true)) {
            $impliedPermissions[] = CampusPermission::DEPARTMENTS_VIEW;
        }
        if (in_array(CampusPermission::PLACEMENT_CREATE, $permissions, true)) {
            $impliedPermissions[] = CampusPermission::PLACEMENT_VIEW;
        }
        if (in_array(CampusPermission::ANNOUNCEMENTS_CREATE, $permissions, true)) {
            $impliedPermissions[] = CampusPermission::ANNOUNCEMENTS_VIEW;
        }
        if (array_intersect([CampusPermission::MARKS_CREATE, CampusPermission::MARKS_APPROVE, CampusPermission::MARKS_PUBLISH], $permissions)) {
            $impliedPermissions[] = CampusPermission::MARKS_VIEW;
        }

        return collect([
            ...self::basePermissions(),
            ...$permissions,
            ...$impliedPermissions,
        ])
            ->filter(fn (mixed $permission) => in_array($permission, CampusPermission::all(), true))
            ->unique()
            ->values()
            ->all();
    }

    public static function defaultPermissions(): array
    {
        return self::normalize(self::presets()['department_coordinator']['permissions']);
    }
}
