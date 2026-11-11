<?php

use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Permissions are synced onto each user when the account is created (UserObserver), so
 * existing accounts need the new ones granted here. New installs get them from the seeder.
 *
 * - dashboards.build: every institution role except recruiters.
 * - dashboards.share, custom_fields.manage: admins (who also pass every check via Gate::before).
 */
return new class extends Migration
{
    private const GRANTS = [
        CampusPermission::DASHBOARDS_BUILD => ['super_admin', 'institution_admin', 'placement_officer', 'staff', 'student'],
        CampusPermission::DASHBOARDS_SHARE => ['super_admin', 'institution_admin'],
        CampusPermission::CUSTOM_FIELDS_MANAGE => ['super_admin', 'institution_admin'],
    ];

    public function up(): void
    {
        foreach (self::GRANTS as $name => $roles) {
            $permissionId = $this->permissionId($name);

            // Role permissions (used by the seeder's role definitions).
            foreach (DB::table('roles')->where('guard_name', 'sanctum')->whereIn('name', $roles)->pluck('id') as $roleId) {
                DB::table('role_has_permissions')->insertOrIgnore(['permission_id' => $permissionId, 'role_id' => $roleId]);
            }

            // Direct user permissions, as UserObserver would have synced them.
            DB::table('users')->whereIn('role', $roles)->whereNull('deleted_at')->orderBy('id')
                ->chunkById(500, function ($users) use ($permissionId): void {
                    DB::table('model_has_permissions')->insertOrIgnore($users->map(fn ($user) => [
                        'permission_id' => $permissionId,
                        'model_type' => User::class,
                        'model_id' => $user->id,
                    ])->all());
                });
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('name', array_keys(self::GRANTS))->pluck('id');

        DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function permissionId(string $name): int
    {
        $existing = DB::table('permissions')->where('name', $name)->where('guard_name', 'sanctum')->value('id');

        return $existing ?? DB::table('permissions')->insertGetId([
            'name' => $name,
            'guard_name' => 'sanctum',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
