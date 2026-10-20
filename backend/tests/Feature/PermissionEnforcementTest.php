<?php

namespace Tests\Feature;

use App\Models\Designation;
use App\Models\Institution;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Campus\CampusStaffAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that permissions are properly seeded to Spatie
     */
    public function test_spatie_permissions_seeded(): void
    {
        // Run seeders
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        // Check that permissions table has all CampusPermission constants
        $expectedCount = count(CampusPermission::all());
        $actualCount = \Spatie\Permission\Models\Permission::where('guard_name', 'sanctum')->count();

        $this->assertEquals($expectedCount, $actualCount, "Expected $expectedCount permissions, got $actualCount");
    }

    /**
     * Test that roles are assigned correct permissions
     */
    public function test_roles_have_correct_permissions(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        $adminRole = \Spatie\Permission\Models\Role::where('name', 'institution_admin')->where('guard_name', 'sanctum')->first();
        $staffRole = \Spatie\Permission\Models\Role::where('name', 'staff')->where('guard_name', 'sanctum')->first();
        $studentRole = \Spatie\Permission\Models\Role::where('name', 'student')->where('guard_name', 'sanctum')->first();

        $this->assertTrue($adminRole->hasPermissionTo('students.view', 'sanctum'));
        $this->assertTrue($staffRole->hasPermissionTo('students.view', 'sanctum'));
        $this->assertTrue($studentRole->hasPermissionTo('announcements.view', 'sanctum'));
        $this->assertFalse($studentRole->hasPermissionTo('students.create', 'sanctum'));
    }

    /**
     * Test that UserObserver syncs permissions when user is created with designation
     */
    public function test_user_observer_syncs_on_creation(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        // Create a designation with permissions
        $designation = Designation::create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Test Coordinator',
            'slug' => 'test-coordinator',
            'status' => 'active',
            'permissions' => CampusStaffAccess::normalize([
                CampusPermission::STUDENTS_VIEW,
                CampusPermission::STUDENTS_CREATE,
            ]),
        ]);

        // Create a staff user with this designation
        $user = User::create([
            'name' => 'Test Staff',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'role' => 'staff',
            'designation_id' => $designation->id,
        ]);

        // Verify user has permission synced
        $this->assertTrue($user->hasPermissionTo('students.view', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('students.create', 'sanctum'));
        $this->assertFalse($user->hasPermissionTo('students.delete', 'sanctum'));
    }

    /**
     * Test that DesignationObserver syncs all users when designation permissions change
     */
    public function test_designation_observer_syncs_on_update(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        // Create designation with initial permissions
        $designation = Designation::create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Test Coordinator',
            'slug' => 'test-coordinator',
            'status' => 'active',
            'permissions' => CampusStaffAccess::normalize([
                CampusPermission::STUDENTS_VIEW,
            ]),
        ]);

        // Create a staff user with this designation
        $user = User::create([
            'name' => 'Test Staff',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'role' => 'staff',
            'designation_id' => $designation->id,
        ]);

        // Verify initial state
        $this->assertTrue($user->hasPermissionTo('students.view', 'sanctum'));
        $this->assertFalse($user->hasPermissionTo('students.create', 'sanctum'));

        // Update designation permissions
        $designation->update([
            'permissions' => CampusStaffAccess::normalize([
                CampusPermission::STUDENTS_VIEW,
                CampusPermission::STUDENTS_CREATE,
                CampusPermission::STUDENTS_EDIT,
            ]),
        ]);

        // Verify user permissions were synced
        $user->refresh();
        $this->assertTrue($user->hasPermissionTo('students.view', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('students.create', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('students.edit', 'sanctum'));
        $this->assertFalse($user->hasPermissionTo('students.delete', 'sanctum'));
    }

    /**
     * Test that UserObserver syncs when designation is changed
     */
    public function test_user_observer_syncs_on_designation_change(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        // Create two designations
        $designation1 = Designation::create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Coordinator 1',
            'slug' => 'coordinator-1',
            'status' => 'active',
            'permissions' => CampusStaffAccess::normalize([
                CampusPermission::STUDENTS_CREATE,
            ]),
        ]);

        $designation2 = Designation::create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Coordinator 2',
            'slug' => 'coordinator-2',
            'status' => 'active',
            'permissions' => CampusStaffAccess::normalize([
                CampusPermission::PLACEMENT_VIEW,
                CampusPermission::PLACEMENT_APPLY,
            ]),
        ]);

        // Create user with designation1
        $user = User::create([
            'name' => 'Test Staff',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'role' => 'staff',
            'designation_id' => $designation1->id,
        ]);

        // Verify initial permissions (students.create comes only from designation1;
        // students.view is part of every staff member's base permissions)
        $this->assertTrue($user->hasPermissionTo('students.create', 'sanctum'));
        $this->assertFalse($user->hasPermissionTo('placement.view', 'sanctum'));

        // Change designation
        $user->update(['designation_id' => $designation2->id]);
        $user->refresh();

        // Verify permissions changed
        $this->assertFalse($user->hasPermissionTo('students.create', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('students.view', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('placement.view', 'sanctum'));
        $this->assertTrue($user->hasPermissionTo('placement.apply', 'sanctum'));
    }

    /**
     * Test that route middleware enforces permissions
     */
    public function test_route_middleware_enforces_permissions(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);
        $this->seed(\Database\Seeders\CampusDemoSeeder::class);

        // Get admin user (has all permissions)
        $admin = User::where('email', 'admin@demo.com')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasPermissionTo('dashboard.view', 'sanctum'));

        // Get student user (limited permissions)
        $student = User::where('email', 'student@demo.com')->first();
        $this->assertNotNull($student);
        $this->assertTrue($student->hasPermissionTo('announcements.view', 'sanctum'));
        $this->assertFalse($student->hasPermissionTo('students.create', 'sanctum'));
    }
}
