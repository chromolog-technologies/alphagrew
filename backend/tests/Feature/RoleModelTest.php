<?php

namespace Tests\Feature;

use App\Models\Designation;
use App\Models\Institution;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Six-role model from the PRD addendum "User Roles and Access".
 */
class RoleModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_institution_admin_logs_in_bound_to_an_institution(): void
    {
        $this->seed();

        $this->postJson('/api/v1/auth/login', ['email' => 'admin@demo.com', 'password' => 'demo123'])
            ->assertOk()
            ->assertJsonPath('user.role', UserRole::InstitutionAdmin->value)
            ->assertJsonPath('user.institutionId', $this->defaultInstitutionId());
    }

    public function test_placement_officer_gets_placement_permissions_but_not_student_management(): void
    {
        $this->seed();

        $response = $this->postJson('/api/v1/auth/login', ['email' => 'placement@demo.com', 'password' => 'demo123'])
            ->assertOk()
            ->assertJsonPath('user.role', UserRole::PlacementOfficer->value);

        $permissions = $response->json('user.permissions');
        $this->assertContains(CampusPermission::COMPANIES_CREATE, $permissions);
        $this->assertContains(CampusPermission::PLACEMENT_MANAGE, $permissions);
        $this->assertNotContains(CampusPermission::STUDENTS_CREATE, $permissions);

        $token = $response->json('token');

        $this->withToken($token)->getJson('/api/v1/students')->assertOk()->assertJsonPath('meta.total', 20);
        $this->withToken($token)->postJson('/api/v1/students', [])->assertForbidden();
    }

    public function test_recruiter_cannot_log_in_until_the_portal_exists(): void
    {
        $this->seed();

        User::query()->create([
            'name' => 'Priya Recruiter',
            'email' => 'recruiter@example.com',
            'password' => 'secret123',
            'role' => UserRole::Recruiter->value,
        ]);

        $this->postJson('/api/v1/auth/login', ['email' => 'recruiter@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonMissingPath('token');
    }

    public function test_login_is_refused_for_an_inactive_institution(): void
    {
        $this->seed();

        Institution::query()->whereKey($this->defaultInstitutionId())->update(['status' => 'inactive']);

        $this->postJson('/api/v1/auth/login', ['email' => 'staff@demo.com', 'password' => 'demo123'])
            ->assertForbidden();
    }

    public function test_student_registration_requires_a_valid_institution_code_and_department(): void
    {
        $this->seed();

        $payload = [
            'name' => 'New Student',
            'email' => 'new.student@example.com',
            'password' => 'secret123',
            'institutionCode' => 'default',
            'departmentCode' => 'cse',
        ];

        $this->postJson('/api/v1/auth/register', [...$payload, 'institutionCode' => 'NOPE'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('institutionCode');

        $this->postJson('/api/v1/auth/register', [...$payload, 'departmentCode' => 'XYZ'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('departmentCode');

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertCreated()
            ->assertJsonPath('user.role', UserRole::Student->value)
            ->assertJsonPath('user.institutionId', $this->defaultInstitutionId())
            ->assertJsonPath('user.departmentCode', 'CSE');
    }

    public function test_admin_can_create_a_placement_officer_through_the_staff_endpoint(): void
    {
        $this->seed();

        $designation = Designation::query()->create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Training & Placement Officer',
            'slug' => 'training-placement-officer',
            'status' => 'active',
            'permissions' => [],
        ]);

        $token = $this->postJson('/api/v1/auth/login', ['email' => 'admin@demo.com', 'password' => 'demo123'])
            ->json('token');

        $this->withToken($token)
            ->postJson('/api/v1/staff', [
                'name' => 'New Officer',
                'email' => 'officer@example.com',
                'role' => UserRole::PlacementOfficer->value,
                'designationId' => $designation->id,
                'departmentCode' => 'CSE',
                'password' => 'secret123',
            ])
            ->assertCreated();

        $officer = User::query()->where('email', 'officer@example.com')->firstOrFail();
        $this->assertSame(UserRole::PlacementOfficer->value, $officer->role);
        $this->assertSame($this->defaultInstitutionId(), $officer->institution_id);
        $this->assertTrue($officer->hasRole(UserRole::PlacementOfficer->value));
        $this->assertTrue($officer->hasPermissionTo(CampusPermission::PLACEMENT_MANAGE, 'sanctum'));

        $this->withToken($token)
            ->getJson('/api/v1/staff')
            ->assertOk()
            ->assertJsonFragment(['email' => 'officer@example.com', 'role' => UserRole::PlacementOfficer->value]);
    }

    public function test_super_admin_is_created_by_command_and_has_no_institution(): void
    {
        $this->seed();

        $this->artisan('alphagrew:super-admin', [
            'email' => 'root@alphagrew.test',
            'name' => 'Platform Owner',
            '--password' => 'longsecret1',
        ])->assertSuccessful();

        $this->postJson('/api/v1/auth/login', ['email' => 'root@alphagrew.test', 'password' => 'longsecret1'])
            ->assertOk()
            ->assertJsonPath('user.role', UserRole::SuperAdmin->value)
            ->assertJsonPath('user.institutionId', null);
    }

    public function test_marks_approve_is_a_declared_permission(): void
    {
        $this->assertContains(CampusPermission::MARKS_APPROVE, CampusPermission::all());
        $this->assertContains(CampusPermission::MARKS_APPROVE, CampusPermission::forRole(UserRole::InstitutionAdmin->value));
    }

    private function defaultInstitutionId(): int
    {
        return Institution::query()->where('code', Institution::DEFAULT_CODE)->value('id');
    }
}
