<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\PlatformRole;
use App\Services\Audit\AuditLogger;
use App\Support\Owner\OwnerPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Platform staff roles and their permissions (SRS FR-RP-001..005). Changes can be previewed
 * (added/removed permissions and the people affected) before saving; every change is audited.
 * Super Admins always hold every permission and are not a role here.
 */
class OwnerRoleController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function permissions(): JsonResponse
    {
        return response()->json(['data' => collect(OwnerPermission::CATALOG)->map(fn (array $items, string $module) => [
            'module' => $module,
            'permissions' => collect($items)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
        ])->values()]);
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => PlatformRole::query()->withCount('users')->orderByDesc('is_system')->orderBy('name')->get()->map(fn (PlatformRole $role) => $this->present($role))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, null);
        $role = PlatformRole::query()->create([...$data, 'slug' => Str::slug($data['name']), 'is_system' => false]);
        $this->audit->record('owner.role_created', $role, [], $role->only(['name', 'permissions']));

        return response()->json(['data' => $this->present($role->loadCount('users'))], 201);
    }

    /** PATCH /owner/roles/{role}; with preview=1 nothing is saved and the change is described. */
    public function update(Request $request, PlatformRole $role): JsonResponse
    {
        $data = $this->validated($request, $role);
        $before = $role->permissions ?? [];
        $after = $data['permissions'] ?? $before;
        $diff = [
            'added' => array_values(array_diff($after, $before)),
            'removed' => array_values(array_diff($before, $after)),
            'affectedUsers' => $role->users()->withoutGlobalScopes()->whereNull('deleted_at')->get(['id', 'name', 'email'])->map->only(['id', 'name', 'email']),
        ];

        if ($request->boolean('preview')) {
            return response()->json(['data' => $diff]);
        }

        $old = $role->only(['name', 'description', 'permissions']);
        $role->update($data);
        $this->audit->record('owner.role_updated', $role, $old, $role->only(['name', 'description', 'permissions']));

        return response()->json(['data' => $this->present($role->loadCount('users')), 'change' => $diff]);
    }

    public function destroy(PlatformRole $role): JsonResponse
    {
        if ($role->is_system) {
            throw BusinessRuleException::conflict('Built-in roles cannot be deleted. Change their permissions instead.');
        }

        if ($role->users()->withoutGlobalScopes()->whereNull('deleted_at')->exists()) {
            throw BusinessRuleException::conflict('Move the people in this role to another role first.');
        }

        $this->audit->record('owner.role_deleted', $role, $role->only(['name', 'permissions']), []);
        $role->delete();

        return response()->json(['message' => 'Role deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?PlatformRole $role): array
    {
        $required = $role ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:120', Rule::unique('platform_roles', 'name')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => [$required, 'array'],
            'permissions.*' => ['string', 'distinct', Rule::in(OwnerPermission::all())],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(PlatformRole $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'permissions' => array_values($role->permissions ?? []),
            'isSystem' => $role->is_system,
            'usersCount' => $role->users_count ?? 0,
        ];
    }
}
