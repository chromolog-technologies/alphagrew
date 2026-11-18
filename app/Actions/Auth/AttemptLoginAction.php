<?php

namespace App\Actions\Auth;

use App\Enums\UserStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\LoginHistory;
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

    public function execute(string $email, string $password, ?string $portal = null): User
    {
        $user = User::query()
            ->with(['student:id,user_id', 'institution'])
            ->where('email', $email)
            ->first();

        if (! $user) {
            $this->audit->record('auth.login_failed', null, [], ['email' => $email]);
            self::history($email, 'failed', null, 'Unknown email');

            throw BusinessRuleException::unprocessable('Invalid credentials.');
        }

        if ($user->isLocked()) {
            self::history($email, 'locked', $user, 'Account locked');
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
            self::history($email, 'refused', $user, 'No portal for this role');
            throw BusinessRuleException::forbidden('The recruiter portal is not available yet. Contact the placement office of the institution that invited you.');
        }

        if ($user->statusEnum() !== UserStatus::Active) {
            self::history($email, 'refused', $user, 'Account '.$user->statusEnum()->value);
            throw BusinessRuleException::forbidden(trim($user->statusEnum()->signInMessage().' '.($user->status_reason ?? '')));
        }

        $this->enforcePortal($user, $portal);

        if (($user->roleEnum()?->requiresInstitution() ?? true) && ! $user->institution?->isActive()) {
            self::history($email, 'refused', $user, 'Institution '.($user->institution?->status ?? 'missing'));
            throw BusinessRuleException::forbidden('Your institution account is inactive. Contact your institution administrator.');
        }

        if ($user->failed_login_attempts > 0 || $user->locked_until !== null) {
            $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null])->saveQuietly();
        }

        $this->audit->record('auth.login', $user, actor: $user);

        return $user;
    }

    /** A completed sign-in (after MFA when it applies). */
    public static function succeeded(User $user): void
    {
        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        self::history($user->email, 'success', $user);
    }

    /** Login history for the owner console (SRS FR-SEC-003). */
    public static function history(string $email, string $outcome, ?User $user, ?string $reason = null): void
    {
        LoginHistory::query()->create([
            'user_id' => $user?->id,
            'institution_id' => $user?->institution_id,
            'email' => mb_substr($email, 0, 255),
            'outcome' => $outcome,
            'reason' => $reason,
            'ip_address' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 255) ?: null,
        ]);
    }

    private function enforcePortal(User $user, ?string $portal): void
    {
        if ($portal === 'owner' && ! $user->isPlatformUser()) {
            $this->audit->record('auth.portal_refused', $user, [], ['portal' => 'owner'], actor: $user);
            self::history($user->email, 'refused', $user, 'Campus user attempted owner console login');

            throw new BusinessRuleException(403, 'Campus and student accounts must sign in through the campus login (/login).', [
                'code' => 'use_campus_login',
            ]);
        }

        if ($portal === 'campus' && $user->isPlatformUser()) {
            $this->audit->record('auth.portal_refused', $user, [], ['portal' => 'campus'], actor: $user);
            self::history($user->email, 'refused', $user, 'Platform user attempted campus login');

            throw new BusinessRuleException(403, 'Platform owner and staff accounts must sign in through the Owner Console login (/owner/login).', [
                'code' => 'use_owner_login',
            ]);
        }
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
        self::history($user->email, $locked ? 'locked' : 'failed', $user, $locked ? 'Too many failed attempts' : 'Wrong password');
    }
}
