<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Auth\AttemptLoginAction;
use App\Actions\Students\CreateStudentAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData) {}

    public function login(LoginRequest $request, AttemptLoginAction $attemptLogin): JsonResponse
    {
        $user = $attemptLogin->execute($request->validated('email'), $request->validated('password'));

        // Keep Spatie permissions aligned with the role and designation.
        $user->syncPermissions($this->campusData->permissionsFor($user));

        return response()->json($this->campusData->authPayload($user, $this->issueToken($request, $user)));
    }

    /**
     * Student self-registration. The account waits for approval by the institution and
     * the student is sent an email to verify the address; no token is issued.
     */
    public function register(RegisterRequest $request, CreateStudentAction $createStudent, AuditLogger $audit): JsonResponse
    {
        $department = $request->department();

        $student = $createStudent->execute(
            $request->toData(),
            $department,
            $request->institution()->id,
            $department->hod ?? '',
            selfRegistered: true,
        );

        $user = $student->user()->firstOrFail()->load('student:id,user_id');
        $user->sendEmailVerificationNotification();
        $audit->record('registration.submitted', $user, actor: $user);

        return response()->json([
            'message' => 'Registration received. Verify your email address; you can sign in once your institution approves your registration.',
            'user' => $this->campusData->authenticatedUser($user),
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->campusData->authenticatedUser($request->user()),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request, AuditLogger $audit): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $request->validated();
        $emailChanged = strcasecmp($payload['email'], $user->email) !== 0;
        $passwordChanged = ! empty($payload['password']);

        DB::transaction(function () use ($user, $payload, $emailChanged): void {
            $user->update([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'title' => $payload['title'],
                ...(! empty($payload['password']) ? ['password' => $payload['password']] : []),
            ]);

            if ($emailChanged) {
                $user->forceFill(['email_verified_at' => null])->save();
            }

            if ($user->role === UserRole::Student->value && $user->student) {
                $user->student->update([
                    'name' => $payload['name'],
                    'email' => $payload['email'],
                ]);
            }
        });

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
            $audit->record('auth.email_changed', $user);
        }

        if ($passwordChanged) {
            // Sign out every other device; this one keeps its token.
            $user->tokens()->whereKeyNot($user->currentAccessToken()?->getKey())->delete();
            $audit->record('auth.password_changed', $user);
        }

        $user = $user->fresh(['student:id,user_id']);

        return response()->json([
            'user' => $this->campusData->authenticatedUser($user),
            'data' => $this->campusData->buildForUser($user),
        ]);
    }

    public function logout(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        $audit->record('auth.logout', $request->user());

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
