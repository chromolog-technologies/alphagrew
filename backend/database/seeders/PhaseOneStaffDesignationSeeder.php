<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Designation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Campus\CampusStaffAccess;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PhaseOneStaffDesignationSeeder extends Seeder
{
    /**
     * Ensure Phase 1 pending item "Staff + Designations" is completed.
     * This seeder is idempotent and can be run multiple times safely.
     */
    public function run(): void
    {
        $department = Department::query()->orderBy('id')->first();

        if (! $department) {
            $this->command?->warn('Phase 1 seeder skipped: no departments found.');
            return;
        }

        $designationSpecs = [
            [
                'name' => 'Head of Department',
                'slug' => 'head-of-department',
                'description' => 'Department leadership with academic and marks approval access.',
                'permissions' => [
                    'dashboard.view',
                    'profile.view',
                    'students.view',
                    'students.create',
                    'departments.view',
                    'announcements.view',
                    'reports.view',
                    'marks.view',
                    'marks.create',
                    'marks.approve',
                ],
            ],
            [
                'name' => 'Exam Coordinator',
                'slug' => 'exam-coordinator',
                'description' => 'Coordinates exam flow and marks operations; approves and publishes results institution-wide.',
                'permissions' => [
                    'dashboard.view',
                    'profile.view',
                    'students.view',
                    'departments.view',
                    'announcements.view',
                    'reports.view',
                    'marks.view',
                    'marks.create',
                    'marks.approve',
                    'marks.publish',
                ],
            ],
        ];

        foreach ($designationSpecs as $spec) {
            Designation::query()->updateOrCreate(
                ['slug' => $spec['slug']],
                [
                    'name' => $spec['name'],
                    'department_id' => $department->id,
                    'description' => $spec['description'],
                    'status' => 'active',
                    'permissions' => CampusStaffAccess::normalize($spec['permissions']),
                ]
            );
        }

        $activeDesignations = Designation::query()
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $hodDesignation = $activeDesignations->firstWhere('slug', 'head-of-department') ?? $activeDesignations->first();
        $examDesignation = $activeDesignations->firstWhere('slug', 'exam-coordinator')
            ?? $activeDesignations->skip(1)->first()
            ?? $hodDesignation;

        if (! $hodDesignation) {
            $this->command?->warn('Phase 1 seeder skipped: no active designations available.');
            return;
        }

        $staffUsers = User::query()->where('role', 'staff')->orderBy('id')->get();

        if ($staffUsers->isEmpty()) {
            $staffUsers = collect([
                User::query()->create([
                    'name' => 'Campus HOD',
                    'email' => 'hod.autogen@demo.com',
                    'password' => 'demo123',
                    'role' => 'staff',
                    'title' => $hodDesignation->name,
                    'department_code' => strtoupper($department->code),
                    'designation_id' => $hodDesignation->id,
                    'email_verified_at' => now(),
                ]),
                User::query()->create([
                    'name' => 'Campus Exam Coordinator',
                    'email' => 'examcoordinator.autogen@demo.com',
                    'password' => 'demo123',
                    'role' => 'staff',
                    'title' => $examDesignation?->name ?? $hodDesignation->name,
                    'department_code' => strtoupper($department->code),
                    'designation_id' => $examDesignation?->id ?? $hodDesignation->id,
                    'email_verified_at' => now(),
                ]),
            ]);
        }

        $staffRole = Role::findOrCreate('staff', 'sanctum');
        $availablePermissionNames = Permission::query()->where('guard_name', 'sanctum')->pluck('name')->all();

        foreach ($staffUsers as $index => $staff) {
            $targetDesignation = $index === 0 ? $hodDesignation : ($examDesignation ?? $hodDesignation);

            $staff->update([
                'designation_id' => $targetDesignation->id,
                'title' => $targetDesignation->name,
                'department_code' => $staff->department_code ?: strtoupper($department->code),
            ]);

            $designationPermissions = method_exists($targetDesignation, 'resolvedPermissions')
                ? $targetDesignation->resolvedPermissions()
                : ($targetDesignation->permissions ?? []);

            $normalized = CampusStaffAccess::normalize(array_merge(
                CampusPermission::byRole()['staff'] ?? [],
                $designationPermissions
            ));

            $syncablePermissions = array_values(array_intersect($normalized, $availablePermissionNames));

            $staff->syncRoles([$staffRole->name]);
            $staff->syncPermissions($syncablePermissions);
        }

        $this->command?->info('Phase 1 seed complete: staff/designations prepared.');
    }
}
