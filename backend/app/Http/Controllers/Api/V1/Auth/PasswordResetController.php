<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * Forgot / reset password (PRD §6 auth hardening). The email link opens the React app
 * (see AppServiceProvider), which posts the token here.
 */
class PasswordResetController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Always answers the same way, so the response doesn't reveal which addresses have accounts.
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink(['email' => $request->validated('email')]);

        return response()->json([
            'message' => 'If an account exists for this email, we have sent a link to reset the password.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                ])->save();

                // Sign out everywhere: whoever knew the old password loses access.
                $user->tokens()->delete();
                $this->audit->record('auth.password_reset', $user, actor: $user);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => 'Your password has been reset. Sign in with your new password.']);
    }
}
