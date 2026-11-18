<?php

namespace App\Enums;

/**
 * Account status. Only active accounts can sign in.
 *
 * Self-registration → pending_approval → active / rejected; an institution can suspend
 * an active account.
 */
enum UserStatus: string
{
    case Active = 'active';
    case PendingApproval = 'pending_approval';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    /** Message shown when an account in this status tries to sign in. */
    public function signInMessage(): string
    {
        return match ($this) {
            self::Active => '',
            self::PendingApproval => 'Your registration is waiting for approval by your institution.',
            self::Rejected => 'Your registration was not approved. Contact your institution.',
            self::Suspended => 'Your account is suspended. Contact your institution administrator.',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
