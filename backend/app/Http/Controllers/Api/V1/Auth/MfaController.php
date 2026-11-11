<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\AttemptLoginAction;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Campus\CampusDataService;
use App\Services\Owner\Totp;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * Two-step verification (TOTP) for platform staff (Owner Dashboard SRS IAM-004, FR-SEC-004).
 *
 * Sign-in: when MFA is on, POST /auth/login answers {mfaRequired, challengeToken} instead of
 * a token; POST /auth/mfa/verify with the code finishes sign-in. The challenge is an
 * encrypted, five-minute ticket bound to the user, so no server state is needed.
 */
class MfaController extends Controller
{
    private const CHALLENGE_MINUTES = 5;

    public function __construct(private readonly AuditLogger $audit, private readonly CampusDataService $campusData)
    {
    }

    public static function challengeFor(User $user): string
    {
        return Crypt::encryptString(json_encode(['user' => $user->id, 'expires' => now()->addMinutes(self::CHALLENGE_MINUTES)->timestamp]));
    }

    /** POST /auth/mfa/verify {challengeToken, code} */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate(['challengeToken' => ['required', 'string'], 'code' => ['required', 'string', 'max:10']]);

        try {
            $challenge = json_decode(Crypt::decryptString($validated['challengeToken']), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            throw BusinessRuleException::unprocessable('This sign-in has expired. Sign in again.');
        }

        $user = User::query()->find($challenge['user'] ?? 0);

        if (! $user || ($challenge['expires'] ?? 0) < now()->timestamp || $user->mfa_enabled_at === null) {
            throw BusinessRuleException::unprocessable('This sign-in has expired. Sign in again.');
        }

        if (! Totp::verify((string) $user->mfa_secret, $validated['code'])) {
            AttemptLoginAction::history($user->email, 'mfa_failed', $user, 'Wrong verification code');
            $this->audit->record('auth.mfa_failed', $user);

            throw BusinessRuleException::unprocessable('That code is not right. Check your authenticator app and try again.');
        }

        AttemptLoginAction::succeeded($user);
        $this->audit->record('auth.mfa_verified', $user, actor: $user);
        $token = $user->createToken(Str::limit($request->userAgent() ?: 'campus-web', 40, '') ?: 'campus-web', $this->campusData->permissionsFor($user))->plainTextToken;

        return response()->json($this->campusData->authPayload($user, $token));
    }

    /** GET /auth/mfa — status for the signed-in user. */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'enabled' => $user->mfa_enabled_at !== null,
            'enabledAt' => $user->mfa_enabled_at?->toIso8601String(),
            'required' => $user->isPlatformUser() && (bool) PlatformSetting::get('mfaRequiredForPlatformStaff'),
            'available' => $user->isPlatformUser(),
        ]]);
    }

    /** POST /auth/mfa/setup — a new secret to add to an authenticator app (not active until confirmed). */
    public function setup(Request $request): JsonResponse
    {
        $user = $this->platformUser($request);

        if ($user->mfa_enabled_at !== null) {
            throw BusinessRuleException::conflict('Two-step verification is already on. Turn it off first to set up a new device.');
        }

        $secret = Totp::generateSecret();
        $user->forceFill(['mfa_secret' => $secret])->save();

        return response()->json(['data' => [
            'secret' => $secret,
            'otpauthUri' => Totp::uri($secret, $user->email, (string) PlatformSetting::get('platformName')),
        ]]);
    }

    /** POST /auth/mfa/confirm {code} — turns MFA on once the first code matches. */
    public function confirm(Request $request): JsonResponse
    {
        $user = $this->platformUser($request);
        $code = $request->validate(['code' => ['required', 'string', 'max:10']])['code'];

        if (! $user->mfa_secret || ! Totp::verify((string) $user->mfa_secret, $code)) {
            throw BusinessRuleException::unprocessable('That code is not right. Check the time on your phone and try again.');
        }

        $user->forceFill(['mfa_enabled_at' => now()])->save();
        $this->audit->record('auth.mfa_enabled', $user, actor: $user);

        return $this->show($request);
    }

    /** POST /auth/mfa/disable {code} */
    public function disable(Request $request): JsonResponse
    {
        $user = $this->platformUser($request);
        $code = $request->validate(['code' => ['required', 'string', 'max:10']])['code'];

        if ($user->mfa_enabled_at === null) {
            throw BusinessRuleException::unprocessable('Two-step verification is not on.');
        }

        if (PlatformSetting::get('mfaRequiredForPlatformStaff')) {
            throw BusinessRuleException::forbidden('Two-step verification is required for platform staff and cannot be turned off.');
        }

        if (! Totp::verify((string) $user->mfa_secret, $code)) {
            throw BusinessRuleException::unprocessable('That code is not right.');
        }

        $user->forceFill(['mfa_secret' => null, 'mfa_enabled_at' => null])->save();
        $this->audit->record('auth.mfa_disabled', $user, actor: $user);

        return $this->show($request);
    }

    private function platformUser(Request $request): User
    {
        $user = $request->user();

        if (! $user->isPlatformUser()) {
            throw BusinessRuleException::forbidden('Two-step verification is available to platform staff.');
        }

        return $user;
    }
}
