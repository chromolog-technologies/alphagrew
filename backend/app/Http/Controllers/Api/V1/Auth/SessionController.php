<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The signed-in user's sessions: one Sanctum token per sign-in, named after the browser.
 */
class SessionController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $currentId = $user->currentAccessToken()?->getKey();
        $expiryMinutes = config('sanctum.expiration');

        $sessions = $user->tokens()
            ->latest('last_used_at')
            ->latest('id')
            ->get()
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => $token->id,
                'device' => $token->name,
                'createdAt' => $token->created_at?->toIso8601String(),
                'lastUsedAt' => $token->last_used_at?->toIso8601String(),
                'expiresAt' => $expiryMinutes ? $token->created_at?->addMinutes((int) $expiryMinutes)->toIso8601String() : null,
                'current' => $token->id === $currentId,
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function destroy(Request $request, int $session): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $token = $user->tokens()->whereKey($session)->firstOrFail();
        $token->delete();
        $this->audit->record('auth.session_revoked', $user, [], ['sessionId' => $session, 'device' => $token->name]);

        return response()->json(['message' => 'Signed out of that device.']);
    }

    /** Signs out every device except the one making the request. */
    public function destroyOthers(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $count = $user->tokens()->whereKeyNot($user->currentAccessToken()?->getKey())->delete();
        $this->audit->record('auth.sessions_revoked', $user, [], ['count' => $count]);

        return response()->json(['message' => "Signed out of {$count} other device(s).", 'revoked' => $count]);
    }
}
