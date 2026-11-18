<?php

namespace App\Actions\Registrations;

use App\Enums\UserStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\User;
use App\Notifications\RegistrationReviewed;
use App\Services\Audit\AuditLogger;

/**
 * Approves or rejects a self-registered student (pending_approval → active / rejected).
 */
class ReviewRegistrationAction
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function approve(User $user): User
    {
        $this->ensurePending($user);

        $user->update(['status' => UserStatus::Active->value, 'status_reason' => null]);
        $this->audit->record('registration.approved', $user, ['status' => UserStatus::PendingApproval->value], ['status' => UserStatus::Active->value]);
        $user->notify(new RegistrationReviewed(true));

        return $user;
    }

    public function reject(User $user, string $reason): User
    {
        $this->ensurePending($user);

        $user->update(['status' => UserStatus::Rejected->value, 'status_reason' => $reason]);
        $user->tokens()->delete();
        $this->audit->record('registration.rejected', $user, ['status' => UserStatus::PendingApproval->value], ['status' => UserStatus::Rejected->value, 'reason' => $reason]);
        $user->notify(new RegistrationReviewed(false, $reason));

        return $user;
    }

    private function ensurePending(User $user): void
    {
        if ($user->statusEnum() !== UserStatus::PendingApproval) {
            throw BusinessRuleException::conflict('This registration has already been reviewed.');
        }
    }
}
