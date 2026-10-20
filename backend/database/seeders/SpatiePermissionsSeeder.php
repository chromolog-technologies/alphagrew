<?php

namespace Database\Seeders;

use App\Support\Campus\CampusPermission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SpatiePermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds ONLY Spatie permissions from CampusPermission constants.
     * No custom system_permissions table involvement.
     */
    public function run(): void
    {
        // First, create all permissions from CampusPermission
        foreach (CampusPermission::all() as $permissionName) {
            Permission::firstOrCreate(
                ['name' => $permissionName, 'guard_name' => 'sanctum']
            );
        }

        // One Spatie role per account type (UserRole enum), with that role's base permissions.
        // Designation permissions are added per user, not per role.
        foreach (CampusPermission::byRole() as $roleName => $permissionNames) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'sanctum'])
                ->syncPermissions($permissionNames);
        }
    }
}
