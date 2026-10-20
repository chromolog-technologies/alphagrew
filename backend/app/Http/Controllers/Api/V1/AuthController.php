<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Students\CreateStudentAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()
            ->with(['student:id,user_id', 'institution'])
            ->where('email', $request->validated('email'))
            ->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if (! ($user->roleEnum()?->hasPortal() ?? true)) {
            return response()->json([
                'message' => 'The recruiter portal is not available yet. Contact the placement office of the institution that invited you.',
            ], 403);
        }

        if (($user->roleEnum()?->requiresInstitution() ?? true) && ! $user->institution?->isActive()) {
            return response()->json([
                'message' => 'Your institution account is inactive. Contact your institution administrator.',
            ], 403);
        }

        // Keep Spatie permissions aligned with the role and designation.
        $user->syncPermissions($this->campusData->permissionsFor($user));

        return response()->json($this->campusData->authPayload($user, $this->issueToken($request, $user)));
    }

    public function register(RegisterRequest $request, CreateStudentAction $createStudent): JsonResponse
    {
        $department = $request->department();

        $student = $createStudent->execute(
            $request->toData(),
            $department,
            $request->institution()->id,
            $department->hod ?? '',
        );

        $user = $student->user()->firstOrFail()->load('student:id,user_id');

        return response()->json($this->campusData->authPayload($user, $this->issueToken($request, $user)), 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->campusData->authenticatedUser($request->user()),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $request->validated();

        DB::transaction(function () use ($user, $payload): void {
            $user->update([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'title' => $payload['title'],
                ...(! empty($payload['password']) ? ['password' => $payload['password']] : []),
            ]);

            if ($user->role === UserRole::Student->value && $user->student) {
                $user->student->update([
                    'name' => $payload['name'],
                    'email' => $payload['email'],
                ]);
            }
        });

        $user = $user->fresh(['student:id,user_id']);

        return response()->json([
            'user' => $this->campusData->authenticatedUser($user),
            'data' => $this->campusData->buildForUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Sanctum token named after the client, carrying the user's permissions as abilities.
     */
    private function issueToken(Request $request, User $user): string
    {
        $tokenName = Str::limit($request->userAgent() ?: 'campus-web', 40, '') ?: 'campus-web';

        return $user->createToken($tokenName, $this->campusData->permissionsFor($user))->plainTextToken;
    }
}
