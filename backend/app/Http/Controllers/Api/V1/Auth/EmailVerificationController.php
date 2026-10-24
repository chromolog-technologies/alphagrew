<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\InstitutionScope;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Email verification. The link in the email is a signed API URL (route
 * "verification.verify"); it works without signing in, because self-registered
 * students can't sign in until approved, then redirects to the React app.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, int $id, string $hash, AuditLogger $audit): RedirectResponse
    {
        $user = User::withoutGlobalScope(InstitutionScope::class)->find($id);

        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect()->away(config('app.frontend_url').'/?verified=invalid');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
            $audit->record('auth.email_verified', $user, actor: $user);
        }

        return redirect()->away(config('app.frontend_url').'/?verified=1');
    }

    public function resend(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email address is already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'We have sent a new verification link to '.$user->email.'.']);
    }
}
