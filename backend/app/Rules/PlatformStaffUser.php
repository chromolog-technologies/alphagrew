<?php

namespace App\Rules;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The id of a Chromolog platform user (super admin or platform staff). Used for owner console
 * "assigned to" and "owner" fields, so a ticket, incident or lead can never be assigned to an
 * institution's own staff or students.
 */
class PlatformStaffUser implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $isPlatform = User::query()
            ->withoutGlobalScopes()
            ->whereKey($value)
            ->whereIn('role', [UserRole::SuperAdmin->value, UserRole::PlatformStaff->value])
            ->exists();

        if (! $isPlatform) {
            $fail('Choose a member of the Chromolog platform team.');
        }
    }
}
