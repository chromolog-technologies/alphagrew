<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Institution;
use App\Models\User;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class TenantValidationAndAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_codes_and_references_are_checked_within_the_callers_institution(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);
        $institutionA = Institution::defaultId();
        $institutionB = Institution::query()->create(['name' => 'Second College', 'code' => 'SECOND', 'slug' => 'second', 'status' => 'active'])->id;

        DB::table('departments')->insert([
            'name' => 'Computer Science', 'code' => 'CSE', 'status' => 'active',
            'institution_id' => $institutionB, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('designations')->insert([
            'name' => 'Lab Assistant', 'slug' => 'lab-assistant', 'status' => 'active',
            'institution_id' => $institutionB, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $foreignDepartment = (int) DB::table('departments')->where('institution_id', $institutionB)->value('id');

        $admin = $this->user($institutionA, 'admin@a.test', UserRole::InstitutionAdmin);
        $foreignUser = $this->user($institutionB, 'staff@b.test', UserRole::Staff);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/departments', ['name' => 'Computer Science', 'code' => 'CSE'])->assertCreated();
        $this->postJson('/api/v1/departments', ['name' => 'CS again', 'code' => 'CSE'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/departments', ['name' => 'Physics', 'code' => 'PHY', 'hod_id' => $foreignUser->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('hod_id');

        $this->postJson('/api/v1/designations', ['name' => 'Lab Assistant', 'slug' => 'lab-assistant'])->assertCreated();
        $this->postJson('/api/v1/designations', ['name' => 'Tutor', 'department_id' => $foreignDepartment])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('department_id');
    }

    public function test_password_changes_are_logged_without_the_hash(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);
        $institutionId = Institution::defaultId();
        $user = $this->user($institutionId, 'someone@a.test', UserRole::Staff);

        app(Tenant::class)->runAs($institutionId, fn () => $user->update(['password' => 'a-new-secret-123', 'phone' => '12345']));

        $log = ActivityLog::withoutGlobalScope(InstitutionScope::class)
            ->where('model_type', 'User')
            ->where('action', 'updated')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame(['old' => '[redacted]', 'new' => '[redacted]'], $log->changes['password']);
        $this->assertSame('12345', $log->changes['phone']['new']);
        $this->assertStringNotContainsString($user->fresh()->password, json_encode($log->changes));
    }

    public function test_db_seed_skips_demo_accounts_when_disabled(): void
    {
        config(['app.demo_seed_enabled' => false]);

        $this->seed();

        $this->assertTrue(Permission::query()->exists());
        $this->assertFalse(User::withoutGlobalScope(InstitutionScope::class)->where('email', 'admin@demo.com')->exists());
    }

    private function user(int $institutionId, string $email, UserRole $role): User
    {
        return app(Tenant::class)->runAs($institutionId, fn () => User::query()->create([
            'name' => $email,
            'email' => $email,
            'password' => 'demo123',
            'role' => $role->value,
            'institution_id' => $institutionId,
        ]));
    }
}
