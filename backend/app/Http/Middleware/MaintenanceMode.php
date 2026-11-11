<?php

namespace App\Http\Middleware;

use App\Models\PlatformSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Platform maintenance mode (Owner Dashboard SRS FR-GS-003). While it is on, institution
 * users get 503 with the configured message, including at sign-in; platform staff keep
 * working so they can switch it off. The health check (/up) is not affected.
 */
class MaintenanceMode
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! PlatformSetting::get('maintenanceEnabled')) {
            return $next($request);
        }

        // Runs before the route's auth middleware, so resolve the bearer token explicitly.
        if ($request->user('sanctum')?->isPlatformUser()) {
            return $next($request);
        }

        // Platform staff must still be able to sign in to turn maintenance off.
        if ($request->is('api/v1/auth/login', 'api/v1/auth/mfa/verify') && $this->isPlatformEmail((string) $request->input('email'), (string) $request->input('challengeToken'))) {
            return $next($request);
        }

        return response()->json([
            'message' => PlatformSetting::get('maintenanceMessage'),
            'code' => 'maintenance',
        ], 503, ['Retry-After' => '600']);
    }

    private function isPlatformEmail(string $email, string $challenge): bool
    {
        if ($challenge !== '') {
            return true; // only platform staff receive MFA challenges
        }

        return $email !== '' && \App\Models\User::query()->where('email', $email)->whereIn('role', ['super_admin', 'platform_staff'])->exists();
    }
}
