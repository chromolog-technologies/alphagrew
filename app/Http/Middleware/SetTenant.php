<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\Tenancy\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the current institution from the authenticated user. Runs after auth:sanctum and
 * before permission checks, on every authenticated API route.
 */
class SetTenant
{
    public function __construct(private readonly Tenant $tenant)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user?->isPlatformUser()) {
            $this->tenant->bypass();
        } elseif ($user) {
            abort_if($user->institution_id === null, 403, 'Your account is not linked to an institution.');

            // A suspended, expired or closed institution loses access at once, not at next sign-in.
            $status = \App\Models\Institution::query()->whereKey($user->institution_id)->value('status');
            if (! in_array($status, ['trial', 'active'], true)) {
                return response()->json([
                    'message' => 'Your institution’s access is '.($status ?? 'unavailable').'. Contact your institution administrator.',
                    'code' => 'institution_inactive',
                ], 403);
            }

            $this->tenant->set($user->institution_id);
        }

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->tenant->forget();
    }
}
