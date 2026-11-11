<?php

namespace App\Http\Middleware;

use App\Models\PlatformSetting;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `owner:{permission}` — owner console routes (Owner Dashboard SRS IAM-001/002). Deny by
 * default: only platform users holding the permission pass; institution users, including
 * institution admins whom Gate::before would let through, always get 403. Platform staff
 * who must use MFA but have not set it up are sent to MFA setup first.
 */
class EnsureOwnerPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user || ! $user->isPlatformUser()) {
            return response()->json(['message' => 'The owner console is for Chromolog platform staff only.', 'code' => 'not_platform_user'], 403);
        }

        if (PlatformSetting::get('mfaRequiredForPlatformStaff') && $user->mfa_enabled_at === null) {
            return response()->json(['message' => 'Set up two-step verification to use the owner console.', 'code' => 'mfa_setup_required'], 403);
        }

        if (! $user->ownerCan($permission)) {
            return response()->json(['message' => 'Your platform role does not allow this.', 'code' => 'owner_permission_denied', 'permission' => $permission], 403);
        }

        return $next($request);
    }
}
