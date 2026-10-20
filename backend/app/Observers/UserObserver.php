<?php

namespace App\Observers;

use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Enums\UserRole;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        $this->syncUserPermissions($user);
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        // Re-sync when role or designation changes.
        if ($user->isDirty('designation_id') || $user->isDirty('role')) {
            $this->syncUserPermissions($user);
        }
    }

    /**
     * Sync Spatie permissions from the user's role and, for institution staff, their designation.
     */
    private function syncUserPermissions(User $user): void
    {
        $designationPermissions = [];

        if ($user->isInstitutionStaff() && $user->designation_id) {
            // Reload: a cached relation would still point at the previous designation.
            $user->unsetRelation('designation');
            $designationPermissions = $user->designation?->resolvedPermissions() ?? [];
        }

        $permissions = CampusPermission::forRole($user->role, $designationPermissions);

        if (! empty($permissions)) {
            $user->syncPermissions($permissions);
        }
    }
}
