<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DesignationModuleMap;
use App\Models\Designation;
use App\Models\ModulePermission;
use App\Models\Department;
use App\Support\Campus\CampusStaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use App\Support\Tenancy\TenantRule;

class DesignationController extends Controller
{
    /**
     * Get all designations with permissions
     */
    public function index(Request $request): JsonResponse
    {
        $query = Designation::with(['department:id,name', 'moduleAccesses.module:id,module_name']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by department
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id)
                ->orWhereNull('department_id');
        }

        // Search by name or description
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $designations = $query->paginate($request->per_page ?? 50);
        $designations->getCollection()->transform(fn (Designation $designation) => $this->transformDesignation($designation));

        return response()->json($designations);
    }

    /**
     * Get single designation with permissions
     */
    public function show(Designation $designation): JsonResponse
    {
        $designation->load([
            'department:id,name',
            'moduleAccesses.module:id,module_name',
            'users:id,first_name,last_name,email',
        ]);

        return response()->json([
            'data' => $this->transformDesignation($designation),
        ]);
    }

    /**
     * Create new designation
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:designations,name',
            'slug' => 'nullable|string|max:255|unique:designations,slug',
            'department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
            'module_access' => 'nullable|array',
            'module_access.*.module_name' => 'required|string|max:100',
            'module_access.*.permissions' => 'required|array',
            'module_access.*.permissions.*' => 'required|string|in:view,create,edit,delete',
        ]);

        // Generate slug if not provided
        if (!isset($validated['slug'])) {
            $validated['slug'] = str()->slug($validated['name']);
        }

        $designation = DB::transaction(function () use ($validated): Designation {
            $designationData = collect($validated)
                ->except(['permissions', 'module_access'])
                ->toArray();

            $designation = Designation::create($designationData);

            $moduleAccess = $validated['module_access'] ?? $this->moduleAccessFromPermissionNames($validated['permissions'] ?? []);
            $normalizedPermissions = CampusStaffAccess::normalize(
                $validated['permissions'] ?? $this->permissionNamesFromModuleAccess($moduleAccess)
            );

            $designation->update(['permissions' => $normalizedPermissions]);
            $this->syncModuleAccess($designation, $moduleAccess);

            return $designation;
        });

        $designation->load(['department:id,name', 'moduleAccesses.module:id,module_name']);

        return response()->json([
            'message' => 'Designation created successfully',
            'data' => $this->transformDesignation($designation),
        ], 201);
    }

    /**
     * Update designation
     */
    public function update(Request $request, Designation $designation): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:255',
                TenantRule::unique('designations', 'name')->ignore($designation->id),
            ],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                TenantRule::unique('designations', 'slug')->ignore($designation->id),
            ],
            'department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
            'module_access' => 'nullable|array',
            'module_access.*.module_name' => 'required|string|max:100',
            'module_access.*.permissions' => 'required|array',
            'module_access.*.permissions.*' => 'required|string|in:view,create,edit,delete',
        ]);

        // Generate slug if provided
        if (isset($validated['slug']) && $validated['slug']) {
            $validated['slug'] = str()->slug($validated['slug']);
        } elseif (isset($validated['name'])) {
            $validated['slug'] = str()->slug($validated['name']);
        }

        DB::transaction(function () use ($designation, $validated): void {
            $designationData = collect($validated)
                ->except(['permissions', 'module_access'])
                ->toArray();

            $designation->update($designationData);

            if (array_key_exists('module_access', $validated)) {
                $moduleAccess = $validated['module_access'] ?? [];
                $permissionNames = $this->permissionNamesFromModuleAccess($moduleAccess);
                $designation->update(['permissions' => CampusStaffAccess::normalize($permissionNames)]);
                $this->syncModuleAccess($designation, $moduleAccess);
            } elseif (array_key_exists('permissions', $validated)) {
                $permissionNames = CampusStaffAccess::normalize($validated['permissions'] ?? []);
                $designation->update(['permissions' => $permissionNames]);
                $this->syncModuleAccess($designation, $this->moduleAccessFromPermissionNames($permissionNames));
            }
        });

        $designation->load(['department:id,name', 'moduleAccesses.module:id,module_name']);

        return response()->json([
            'message' => 'Designation updated successfully',
            'data' => $this->transformDesignation($designation),
        ]);
    }

    /**
     * Delete designation
     */
    public function destroy(Designation $designation): JsonResponse
    {
        $designation->delete();

        return response()->json([
            'message' => 'Designation deleted successfully',
        ]);
    }

    /**
     * Get departments for dropdown
     */
    public function getDepartments(): JsonResponse
    {
        $departments = Department::select('id', 'name')
            ->where('status', 'active')
            ->get();

        return response()->json([
            'data' => $departments,
        ]);
    }

    /**
     * Get all permissions for assignment
     */
    public function getPermissions(Request $request): JsonResponse
    {
        $query = Permission::query()->where('guard_name', 'sanctum');

        // Group by module
        if ($request->has('group_by_module') && $request->group_by_module) {
            $permissions = $query->get(['id', 'name'])->groupBy(function (Permission $permission) {
                return (string) str($permission->name)->before('.');
            })->map(function ($items, $module) {
                return [
                    'module_name' => $module,
                    'actions' => $items->map(function (Permission $permission) {
                        return (string) str($permission->name)->after('.');
                    })->values()->unique()->all(),
                    'permissions' => $items->map(fn (Permission $permission) => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                    ])->values()->all(),
                ];
            })->values();

            return response()->json([
                'data' => $permissions,
            ]);
        }

        // Filter by module
        if ($request->has('module')) {
            $query->where('name', 'like', $request->module.'.%');
        }

        $permissions = $query->get(['id', 'name']);

        return response()->json([
            'data' => $permissions,
        ]);
    }

    /**
     * Assign permissions to designation
     */
    public function assignPermissions(Request $request, Designation $designation): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'nullable|array',
            'permissions.*' => 'required|string|exists:permissions,name',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'required|integer|exists:permissions,id',
        ]);

        if (empty($validated['permissions']) && empty($validated['permission_ids'])) {
            return response()->json([
                'message' => 'permissions or permission_ids is required',
            ], 422);
        }

        $permissionNames = $validated['permissions'] ?? Permission::query()
            ->where('guard_name', 'sanctum')
            ->whereIn('id', $validated['permission_ids'] ?? [])
            ->pluck('name')
            ->values()
            ->all();

        $permissionNames = CampusStaffAccess::normalize($permissionNames);
        $designation->update(['permissions' => $permissionNames]);
        $this->syncModuleAccess($designation, $this->moduleAccessFromPermissionNames($permissionNames));

        $designation->load(['department:id,name', 'moduleAccesses.module:id,module_name']);

        return response()->json([
            'message' => 'Permissions assigned successfully',
            'data' => $this->transformDesignation($designation),
        ]);
    }

    /**
     * Get designations by department
     */
    public function getByDepartment(Department $department): JsonResponse
    {
        $designations = Designation::where('department_id', $department->id)
            ->orWhereNull('department_id')
            ->with(['moduleAccesses.module:id,module_name'])
            ->get();

        return response()->json([
            'data' => $designations->map(fn (Designation $designation) => $this->transformDesignation($designation))->values(),
        ]);
    }

    /**
     * Get global designations (not department-specific)
     */
    public function getGlobal(): JsonResponse
    {
        $designations = Designation::whereNull('department_id')
            ->where('status', 'active')
            ->with(['moduleAccesses.module:id,module_name'])
            ->get();

        return response()->json([
            'data' => $designations->map(fn (Designation $designation) => $this->transformDesignation($designation))->values(),
        ]);
    }

    private function transformDesignation(Designation $designation): array
    {
        $permissions = CampusStaffAccess::normalize($designation->permissions ?? []);

        return [
            'id' => $designation->id,
            'name' => $designation->name,
            'slug' => $designation->slug,
            'department_id' => $designation->department_id,
            'description' => $designation->description,
            'status' => $designation->status,
            'permissions' => $permissions,
            'module_access' => $this->moduleAccessFromPermissionNames($permissions),
            'department' => $designation->department,
            'users' => $designation->relationLoaded('users') ? $designation->users : null,
            'created_at' => $designation->created_at,
            'updated_at' => $designation->updated_at,
        ];
    }

    private function moduleAccessFromPermissionNames(array $permissionNames): array
    {
        $actionsByModule = [];

        foreach ($permissionNames as $permissionName) {
            if (!str_contains($permissionName, '.')) {
                continue;
            }

            [$module, $action] = explode('.', $permissionName, 2);
            if (!in_array($action, ['view', 'create', 'edit', 'delete'], true)) {
                continue;
            }

            $actionsByModule[$module] ??= [];
            $actionsByModule[$module][] = $action;
        }

        return collect($actionsByModule)
            ->map(fn (array $actions, string $module) => [
                'module_name' => $module,
                'permissions' => collect($actions)->unique()->values()->all(),
            ])
            ->values()
            ->all();
    }

    private function permissionNamesFromModuleAccess(array $moduleAccess): array
    {
        return collect($moduleAccess)
            ->flatMap(function ($item): array {
                $module = strtolower((string) ($item['module_name'] ?? ''));
                $actions = collect($item['permissions'] ?? [])
                    ->map(fn ($action) => strtolower((string) $action))
                    ->filter(fn (string $action) => in_array($action, ['view', 'create', 'edit', 'delete'], true))
                    ->unique()
                    ->values();

                if ($module === '' || $actions->isEmpty()) {
                    return [];
                }

                return $actions->map(fn (string $action) => $module.'.'.$action)->all();
            })
            ->unique()
            ->values()
            ->all();
    }

    private function syncModuleAccess(Designation $designation, array $moduleAccess): void
    {
        $designation->moduleAccesses()->delete();

        foreach ($moduleAccess as $item) {
            $moduleName = strtolower((string) ($item['module_name'] ?? ''));
            if ($moduleName === '') {
                continue;
            }

            $module = ModulePermission::query()->firstOrCreate([
                'module_name' => $moduleName,
            ]);

            $actions = collect($item['permissions'] ?? [])
                ->map(fn ($action) => strtolower((string) $action))
                ->filter(fn (string $action) => in_array($action, ['view', 'create', 'edit', 'delete'], true))
                ->unique()
                ->values()
                ->all();

            if (empty($actions)) {
                continue;
            }

            DesignationModuleMap::query()->create([
                'designation_id' => $designation->id,
                'module_id' => $module->id,
                'permissions' => $actions,
            ]);
        }
    }
}
