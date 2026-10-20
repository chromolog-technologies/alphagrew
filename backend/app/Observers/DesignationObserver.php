<?php

namespace App\Observers;

use App\Models\Designation;
use App\Support\Campus\CampusPermission;

class DesignationObserver
{
    /**
     * Handle the Designation "updated" event.
     * When a designation's permissions change, sync all users with that designation.
     */
    public function updated(Designation $designation): void
    {
        $this->syncUsersForDesignation($designation);
    }

    /**
     * Sync all users with this designation to the new permission set.
     */
    private function syncUsersForDesignation(Designation $designation): void
    {
        $designationPermissions = $designation->resolvedPermissions();

        // Get all users with this designation
        $designation->users()->each(function ($user) use ($designationPermissions): void {
            $user->syncPermissions(CampusPermission::forRole($user->role, $designationPermissions));
        });
    }
}
