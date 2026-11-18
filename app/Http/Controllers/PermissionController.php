<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PermissionService;

class PermissionController extends Controller
{
    /**
     * Get user's accessible modules
     */
    public function getModules(Request $request)
    {
        $user = $request->user();
        $modules = PermissionService::getUserModules($user);
        
        return response()->json([
            'modules' => $modules,
            'role' => $user->getRoleNames()->first(),
            'role_label' => PermissionService::getUserRoleLabel($user),
        ]);
    }

    /**
     * Get user's permissions for all modules
     */
    public function getPermissions(Request $request)
    {
        $user = $request->user();
        $permissions = PermissionService::getModuleActions($user);
        
        return response()->json([
            'permissions' => $permissions,
            'role' => $user->getRoleNames()->first(),
        ]);
    }

    /**
     * Check if user has specific permission
     */
    public function checkPermission(Request $request, string $permission)
    {
        $user = $request->user();
        // checkPermissionTo returns false for unknown names instead of throwing.
        $hasPermission = $user->checkPermissionTo($permission, 'sanctum');
        
        return response()->json([
            'permission' => $permission,
            'has_permission' => $hasPermission,
        ]);
    }

    /**
     * Get all available roles (requires roles.view, enforced by route middleware)
     */
    public function getAllRoles(Request $request)
    {
        $roles = \Spatie\Permission\Models\Role::where('guard_name', 'sanctum')
            ->with('permissions')
            ->get()
            ->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions_count' => $role->permissions->count(),
                    'permissions' => $role->permissions->pluck('name')->toArray(),
                ];
            });

        return response()->json([
            'roles' => $roles,
        ]);
    }

    /**
     * Get specific role with its permissions (requires roles.view, enforced by route middleware)
     */
    public function getRole(Request $request, $roleId)
    {
        $role = \Spatie\Permission\Models\Role::where('guard_name', 'sanctum')
            ->with('permissions')
            ->findOrFail($roleId);

        return response()->json([
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'name' => $perm->name,
                ];
            }),
        ]);
    }
}
