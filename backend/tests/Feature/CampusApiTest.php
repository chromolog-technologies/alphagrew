<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class CampusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_login_returns_user_and_bootstrap_payload(): void
    {
        $this->seed();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@demo.com',
            'password' => 'demo123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['token'])
            ->assertJsonPath('user.email', 'admin@demo.com')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.permissions.0', 'announcements.create')
            ->assertJsonCount(4, 'data.departments')
            ->assertJsonCount(20, 'data.students')
            ->assertJsonCount(5, 'data.companies')
            ->assertJsonCount(5, 'data.announcements');

        $this->assertSame(1, PersonalAccessToken::query()->count());
    }

    public function test_bootstrap_requires_sanctum_token(): void
    {
        $this->seed();

        $this->getJson('/api/v1/campus/bootstrap')
            ->assertUnauthorized();
    }

    public function test_student_cannot_access_reports_module(): void
    {
        $this->seed();

        $token = $this->loginAndGetToken('student@demo.com');

        $this->withToken($token)
            ->getJson('/api/v1/reports/summary')
            ->assertForbidden();
    }

    public function test_staff_bootstrap_is_scoped_to_department_and_permissions(): void
    {
        $this->seed();

        $token = $this->loginAndGetToken('staff@demo.com');

        $response = $this->withToken($token)
            ->getJson('/api/v1/campus/bootstrap');

        $response
            ->assertOk()
            ->assertJsonPath('user.role', 'staff')
            ->assertJsonMissingPath('user.permissions.9')
            ->assertJsonCount(7, 'data.students');

        $students = $response->json('data.students');

        $this->assertNotEmpty($students);
        $this->assertTrue(collect($students)->every(fn (array $student) => $student['departmentCode'] === 'CSE'));
    }

    public function test_student_can_apply_only_once_to_an_eligible_company(): void
    {
        $this->seed();

        $token = $this->loginAndGetToken('student@demo.com');

        $this->withToken($token)
            ->postJson('/api/v1/companies/3/apply')
            ->assertOk()
            ->assertJsonPath('data.students.0.appliedCompanyIds.1', 3);

        $this->withToken($token)
            ->postJson('/api/v1/companies/3/apply')
            ->assertOk();

        $bootstrap = $this->withToken($token)
            ->getJson('/api/v1/campus/bootstrap');

        $bootstrap->assertOk();

        $student = $bootstrap->json('data.students.0');

        $this->assertSame([2, 3], $student['appliedCompanyIds']);
        $this->assertSame(25, $bootstrap->json('data.companies.2.applicants'));
    }

    public function test_demo_reset_is_blocked_when_disabled(): void
    {
        $this->seed();
        config(['app.demo_reset_enabled' => false]);

        $token = $this->loginAndGetToken('admin@demo.com');

        $this->withToken($token)
            ->postJson('/api/v1/campus/reset')
            ->assertForbidden()
            ->assertJsonPath('message', 'Demo reset is disabled in this environment.');
    }

    public function test_permission_routes_require_permissions(): void
    {
        $this->seed();

        $this->getJson('/api/v1/permissions/all')->assertUnauthorized();

        $studentToken = $this->loginAndGetToken('student@demo.com');

        $this->withToken($studentToken)
            ->getJson('/api/v1/permissions/all')
            ->assertOk();

        $this->withToken($studentToken)
            ->getJson('/api/v1/permissions/roles/all')
            ->assertForbidden();

        $this->withToken($studentToken)
            ->getJson('/api/v1/permissions/no.such.permission/check')
            ->assertOk()
            ->assertJsonPath('has_permission', false);

        // The guard caches the resolved user between requests; reset it before switching accounts.
        $this->app['auth']->forgetGuards();
        $adminToken = $this->loginAndGetToken('admin@demo.com');

        $this->withToken($adminToken)
            ->getJson('/api/v1/permissions/roles/all')
            ->assertOk()
            ->assertJsonStructure(['roles']);
    }

    public function test_sample_data_endpoints_are_flagged(): void
    {
        $this->seed();

        $token = $this->loginAndGetToken('student@demo.com');

        $this->withToken($token)
            ->getJson('/api/v1/student/notifications')
            ->assertOk()
            ->assertHeader('X-Data-Source', 'sample');

        $this->withToken($token)
            ->getJson('/api/v1/campus/bootstrap')
            ->assertOk()
            ->assertHeaderMissing('X-Data-Source');
    }

    private function loginAndGetToken(string $email): string
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'demo123',
        ]);

        $response->assertOk();

        return (string) $response->json('token');
    }
}
