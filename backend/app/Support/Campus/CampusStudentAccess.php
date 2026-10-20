<?php

namespace App\Support\Campus;

final class CampusStudentAccess
{
    /**
     * Default student module access profile.
     *
     * Edit this list when student defaults need to change.
     */
    public static function defaultPermissions(): array
    {
        return self::normalize([
            CampusPermission::DASHBOARD_VIEW,
            CampusPermission::PROFILE_VIEW,
            CampusPermission::PROFILE_EDIT,
            CampusPermission::PLACEMENT_VIEW,
            CampusPermission::PLACEMENT_APPLY,
            CampusPermission::ANNOUNCEMENTS_VIEW,
            CampusPermission::TIMETABLE_VIEW,
            CampusPermission::MATERIALS_VIEW,
            CampusPermission::ASSIGNMENTS_VIEW,
            CampusPermission::ASSIGNMENTS_SUBMIT,
            CampusPermission::MARKS_VIEW,
            CampusPermission::ATTENDANCE_VIEW,
            CampusPermission::NOTIFICATIONS_VIEW,
            CampusPermission::RESUMES_MANAGE,
            CampusPermission::INTERVIEWS_PRACTICE,
        ]);
    }

    public static function normalize(array $permissions): array
    {
        return collect($permissions)
            ->filter(fn (string $permission) => in_array($permission, CampusPermission::all(), true))
            ->unique()
            ->values()
            ->all();
    }
}
