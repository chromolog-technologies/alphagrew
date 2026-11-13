<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\LoginHistory;
use App\Models\PlatformRole;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use App\Services\Audit\AuditLogger;
use App\Support\Owner\OwnerPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Platform-wide user directory and platform staff management (SRS FR-US-001..006, FR-RP-004).
 * Responses never include password hashes, tokens, MFA secrets or student profile data.
 */
class OwnerUserController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'institutionId' => ['nullable', 'integer'],
            'role' => ['nullable', Rule::in(UserRole::values())],
            'status' => ['nullable', Rule::in(UserStatus::values())],
            'registeredFrom' => ['nullable', 'date'],
            'registeredTo' => ['nullable', 'date'],
            'platformOnly' => ['nullable', 'boolean'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $page = User::query()->withoutGlobalScopes()->whereNull('users.deleted_at')
            ->with(['platformRole:id,name'])
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($inner) => $inner->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")))
            ->when($filters['institutionId'] ?? null, fn ($query, int $id) => $query->where('institution_id', $id))
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['registeredFrom'] ?? null, fn ($query, string $date) => $query->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['registeredTo'] ?? null, fn ($query, string $date) => $query->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->when($request->boolean('platformOnly'), fn ($query) => $query->whereIn('role', [UserRole::SuperAdmin->value, UserRole::PlatformStaff->value]))
            ->latest('created_at')
            ->paginate($filters['perPage'] ?? 25);

        $institutions = Institution::query()->whereIn('id', collect($page->items())->pluck('institution_id')->filter()->unique())->pluck('name', 'id');

        return response()->json([
            'data' => collect($page->items())->map(fn (User $user) => $this->summary($user, $institutions[$user->institution_id] ?? null)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total(), 'perPage' => $page->perPage()],
            'roles' => PlatformRole::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(int $user): JsonResponse
    {
        $model = $this->find($user);
        $institution = $model->institution_id ? Institution::query()->find($model->institution_id) : null;

        return response()->json(['data' => [
            ...$this->summary($model, $institution?->name),
            'statusReason' => $model->status_reason,
            'title' => $model->title,
            'phone' => $model->phone,
            'emailVerified' => $model->email_verified_at !== null,
            'lockedUntil' => $model->locked_until?->toIso8601String(),
            'activeSessions' => DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $model->id)
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count(),
            'ownerPermissions' => $model->ownerPermissions(),
            'recentLogins' => LoginHistory::query()->where('user_id', $model->id)->latest('created_at')->limit(10)->get()
                ->map(fn (LoginHistory $entry) => ['outcome' => $entry->outcome, 'reason' => $entry->reason, 'ip' => $entry->ip_address, 'userAgent' => $entry->user_agent, 'at' => $entry->created_at?->toIso8601String()]),
        ]]);
    }

    /** POST /owner/users/invitations — a platform staff member (or a Super Admin, by a Super Admin). */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::in([UserRole::PlatformStaff->value, UserRole::SuperAdmin->value])],
            'platformRoleId' => ['required_if:role,platform_staff', 'nullable', 'integer', Rule::exists('platform_roles', 'id')],
        ]);

        if ($data['role'] === UserRole::SuperAdmin->value && ! $request->user()->isSuperAdmin()) {
            throw BusinessRuleException::forbidden('Only a Super Admin can add another Super Admin.');
        }

        $user = new User(['name' => $data['name'], 'email' => $data['email'], 'password' => Str::random(40), 'role' => $data['role'], 'title' => 'Platform staff']);
        $user->platform_role_id = $data['role'] === UserRole::PlatformStaff->value ? $data['platformRoleId'] : null;
        $user->institution_id = null;
        $user->save();

        try {
            $token = Password::broker()->createToken($user);
            $user->notify(new VerifyAccountNotification($token, null, false));
        } catch (\Throwable $e) {
            Log::warning("Failed to send platform user invite link to {$user->email}: {$e->getMessage()}");
        }
        $this->audit->record('owner.platform_user_invited', $user, [], ['email' => $user->email, 'role' => $user->role, 'platformRoleId' => $user->platform_role_id]);

        return response()->json(['data' => $this->summary($user->load('platformRole'), null)], 201);
    }

    /** PATCH /owner/users/{user} {platformRoleId} — change a platform staff member's role. */
    public function update(Request $request, int $user): JsonResponse
    {
        $model = $this->find($user);
        $data = $request->validate(['platformRoleId' => ['required', 'integer', Rule::exists('platform_roles', 'id')]]);

        if ($model->roleEnum() !== UserRole::PlatformStaff) {
            throw BusinessRuleException::unprocessable('Only platform staff have a platform role.');
        }

        $before = ['platformRoleId' => $model->platform_role_id];
        $model->forceFill(['platform_role_id' => $data['platformRoleId']])->save();
        $this->audit->record('owner.platform_role_assigned', $model, $before, ['platformRoleId' => $model->platform_role_id]);

        return $this->show($model->id);
    }

    /** POST /owner/users/{user}/status {status: active|suspended, reason} */
    public function changeStatus(Request $request, int $user): JsonResponse
    {
        $model = $this->find($user);
        $data = $request->validate([
            'status' => ['required', Rule::in([UserStatus::Active->value, UserStatus::Suspended->value])],
            'reason' => ['required_if:status,suspended', 'nullable', 'string', 'max:255'],
        ]);

        if ($model->id === $request->user()->id) {
            throw BusinessRuleException::unprocessable('You cannot change your own account status.');
        }

        if ($data['status'] === UserStatus::Suspended->value && $model->isSuperAdmin() && $this->activeSuperAdmins() <= 1) {
            throw BusinessRuleException::conflict('This is the last active Super Admin. Add another Super Admin first.');
        }

        $before = ['status' => $model->status, 'reason' => $model->status_reason];

        DB::transaction(function () use ($model, $data): void {
            $model->forceFill(['status' => $data['status'], 'status_reason' => $data['status'] === 'suspended' ? $data['reason'] : null])->save();

            if ($data['status'] === UserStatus::Suspended->value) {
                $model->tokens()->delete(); // signed out everywhere
            }
        });

        $this->audit->record($data['status'] === 'suspended' ? 'owner.user_suspended' : 'owner.user_activated', $model, $before, ['status' => $model->status, 'reason' => $model->status_reason], institutionId: $model->institution_id);

        return $this->show($model->id);
    }

    public function sendPasswordReset(int $user): JsonResponse
    {
        $model = $this->find($user);
        try {
            Password::broker()->sendResetLink(['email' => $model->email]);
        } catch (\Throwable $e) {
            Log::warning("Failed to send password reset link to {$model->email}: {$e->getMessage()}");
            throw BusinessRuleException::unprocessable("Failed to send email via SMTP ({$e->getMessage()}). Please check MAIL_USERNAME and MAIL_PASSWORD in .env.");
        }
        $this->audit->record('owner.password_reset_sent', $model, institutionId: $model->institution_id);

        return response()->json(['message' => "A password reset link was sent to {$model->email}."]);
    }

    /** POST /owner/users/{user}/resend-invite (SRS FR-US-005). */
    public function resendInvite(int $user): JsonResponse
    {
        $model = $this->find($user);
        if ($model->statusEnum() === UserStatus::Suspended) {
            throw BusinessRuleException::conflict('Reactivate this suspended account before resending an invitation.');
        }

        try {
            $institutionName = $model->institution?->name;
            $token = Password::broker()->createToken($model);
            $model->notify(new VerifyAccountNotification($token, $institutionName, true));
        } catch (\Throwable $e) {
            Log::warning("Failed to resend invite to {$model->email}: {$e->getMessage()}");
            throw BusinessRuleException::unprocessable("Failed to send email via SMTP ({$e->getMessage()}). Please check MAIL_USERNAME and MAIL_PASSWORD in .env.");
        }
        $this->audit->record('owner.user_invite_resent', $model, institutionId: $model->institution_id);

        return response()->json(['message' => "Invitation / verification link resent to {$model->email}."]);
    }

    public function revokeSessions(Request $request, int $user): JsonResponse
    {
        $model = $this->find($user);
        $revoked = $model->tokens()->when($model->id === $request->user()->id, fn ($query) => $query->whereKeyNot($request->user()->currentAccessToken()?->id))->delete();
        $this->audit->record('owner.sessions_revoked', $model, [], ['revoked' => $revoked], institutionId: $model->institution_id);

        return response()->json(['revoked' => $revoked]);
    }

    private function find(int $id): User
    {
        return User::query()->withoutGlobalScopes()->whereNull('deleted_at')->with('platformRole')->findOrFail($id);
    }

    private function activeSuperAdmins(): int
    {
        return User::query()->withoutGlobalScopes()->whereNull('deleted_at')->where('role', UserRole::SuperAdmin->value)->where('status', UserStatus::Active->value)->count();
    }

    /** @return array<string, mixed> */
    private function summary(User $user, ?string $institution): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'roleLabel' => $user->roleEnum()?->label() ?? $user->role,
            'platformRole' => $user->platformRole ? ['id' => $user->platformRole->id, 'name' => $user->platformRole->name] : null,
            'isPlatform' => $user->isPlatformUser(),
            'status' => $user->statusEnum()->value,
            'institutionId' => $user->institution_id,
            'institution' => $institution,
            'title' => $user->title,
            'phone' => $user->phone,
            'emailVerified' => $user->email_verified_at !== null,
            'mfaEnabled' => $user->mfa_enabled_at !== null,
            'lastLoginAt' => $user->last_login_at?->toIso8601String(),
            'createdAt' => $user->created_at?->toIso8601String(),
        ];
    }
}
