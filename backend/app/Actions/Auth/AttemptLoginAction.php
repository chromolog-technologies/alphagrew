<?php

namespace App\Actions\Auth;

use App\Enums\UserStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Hash;

/**
 * Checks credentials, account lockout and account status (PRD §6 auth hardening).
 * After MAX_FAILED_ATTEMPTS wrong passwords the account is locked for LOCK_MINUTES,
 * whichever address the attempts come from (the login rate limit is per address).
 */
class AttemptLoginAction
{
    public const MAX_FAILED_ATTEMPTS = 10;

    public const LOCK_MINUTES = 15;

    public function __construct(private readonly AuditLogger $audit) {}

    public function execute(string $email, string $password): User
    {
        $user = User::query()
            ->with(['student:id,user_id', 'institution'])
            ->where('email', $email)
            ->first();

        if (! $user) {
            $this->audit->record('auth.login_failed', null, [], ['email' => $email]);

            throw BusinessRuleException::unprocessable('Invalid credentials.');
        }

        if ($user->isLocked()) {
            throw new BusinessRuleException(423, sprintf(
                'Too many failed sign-in attempts. Try again in %d minutes or reset your password.',
                max(1, (int) ceil(now()->diffInSeconds($user->locked_until) / 60)),
            ));
        }

        if (! Hash::check($password, $user->password)) {
            $this->recordFailure($user);

            throw BusinessRuleException::unprocessable('Invalid credentials.');
        }

        if (! ($user->roleEnum()?->hasPortal() ?? true)) {
            throw BusinessRuleException::forbidden('The recruiter portal is not available yet. Contact the placement office of the institution that invited you.');
        }

        if ($user->statusEnum() !== UserStatus::Active) {
            throw BusinessRuleException::forbidden(trim($user->statusEnum()->signInMessage().' '.($user->status_reason ?? '')));
        }

        if (($user->roleEnum()?->requiresInstitution() ?? true) && ! $user->institution?->isActive()) {
            throw BusinessRuleException::forbidden('Your institution account is inactive. Contact your institution administrator.');
        }

        if ($user->failed_login_attempts > 0 || $user->locked_until !== null) {
            $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null])->saveQuietly();
        }

        $this->audit->record('auth.login', $user, actor: $user);

        return $user;
    }

    private function recordFailure(User $user): void
    {
        $attempts = $user->failed_login_attempts + 1;
        $locked = $attempts >= self::MAX_FAILED_ATTEMPTS;

        $user->forceFill([
            'failed_login_attempts' => $locked ? 0 : $attempts,
            'locked_until' => $locked ? now()->addMinutes(self::LOCK_MINUTES) : $user->locked_until,
        ])->saveQuietly();

        // No actor: the person typing the password is not known to be the account owner.
        $this->audit->record($locked ? 'auth.locked' : 'auth.login_failed', $user);
    }
}
