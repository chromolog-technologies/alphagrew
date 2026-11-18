<?php

namespace App\Actions\Staff;

use App\Models\User;

/**
 * Removes a staff / placement-officer account and revokes its API tokens.
 */
class DeleteStaffMemberAction
{
    public function execute(User $staff): void
    {
        $staff->tokens()->delete();
        $staff->delete();
    }
}
