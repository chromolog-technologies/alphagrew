<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\LoginHistory;
use App\Models\PlatformRole;
use App\Models\User;
use App\Notifications\InstitutionStatusChanged;
use App\Services\Owner\Totp;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Owner Dashboard SRS release 1: platform access control, institution lifecycle, platform
 * users and roles, global settings with maintenance mode, MFA, login history and overview.
 */
class OwnerConsoleTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string> */
    private array $tokens = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Cache::flush();
        $this->platformUser('owner@test.dev', UserRole::SuperAdmin, null);
        $this->platformUser('support@test.dev', UserRole::PlatformStaff, 'support-manager');
        $this->platformUser('auditor@test.dev', UserRole::PlatformStaff, 'security-auditor');
    }

    public function test_institution_users_never_reach_owner_routes_and_staff_only_their_permissions(): void
    {
        foreach (['/api/v1/owner/dashboard/summary', '/api/v1/owner/institutions', '/api/v1/owner/users', '/api/v1/owner/settings', '/api/v1/owner/audit-logs'] as $path) {
            // Institution admins pass every Gate check, but not the owner console.
            $this->as('admin@demo.com')->getJson($path)->assertForbidden()->assertJsonPath('code', 'not_platform_user');
            $this->as('student@demo.com')->getJson($path)->assertForbidden();
        }

        $this->as('support@test.dev')->getJson('/api/v1/owner/institutions')->assertOk();
        $this->as('support@test.dev')->postJson('/api/v1/owner/institutions', $this->institutionPayload())->assertForbidden()->assertJsonPath('code', 'owner_permission_denied');
        $this->as('support@test.dev')->getJson('/api/v1/owner/settings')->assertForbidden();

        // The security auditor reads but cannot change anything.
        $this->as('auditor@test.dev')->getJson('/api/v1/owner/audit-logs')->assertOk();
        $this->as('auditor@test.dev')->postJson('/api/v1/owner/institutions/'.Institution::defaultId().'/status', ['status' => 'suspended', 'reason' => 'x'])->assertForbidden();

        // Platform users get no institution records in their session payload.
        $this->as('owner@test.dev')->getJson('/api/v1/campus/bootstrap')->assertOk()->assertJsonCount(0, 'data.students');
        $this->as('owner@test.dev')->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('user.ownerPermissions.0', 'owner.dashboard.view');
    }

    public function test_creating_an_institution_with_its_first_admin(): void
    {
        Notification::fake();

        $id = $this->as('owner@test.dev')->postJson('/api/v1/owner/institutions', $this->institutionPayload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'trial')
            ->assertJsonPath('data.verificationStatus', 'pending')
            ->assertJsonPath('data.counts.admins', 1)
            ->json('data.id');

        $admin = User::query()->withoutGlobalScopes()->where('email', 'principal@lakeside.test')->firstOrFail();
        $this->assertSame($id, $admin->institution_id);
        $this->assertSame(UserRole::InstitutionAdmin->value, $admin->role);
        Notification::assertSentTo($admin, ResetPassword::class);
        $this->assertNotNull(Institution::query()->find($id)->trial_ends_at);

        $this->as('owner@test.dev')->postJson('/api/v1/owner/institutions', $this->institutionPayload())->assertUnprocessable()->assertJsonValidationErrors(['code', 'adminEmail']);
        $this->as('owner@test.dev')->getJson('/api/v1/owner/institutions?search=lake')->assertOk()->assertJsonCount(1, 'data');
        $this->assertTrue(AuditLog::query()->withoutGlobalScopes()->where('action', 'owner.institution_created')->exists());
    }

    public function test_suspension_blocks_signed_in_users_immediately_and_reactivation_restores_access(): void
    {
        Notification::fake();
        $institution = Institution::defaultId();
        $adminToken = $this->token('admin@demo.com');

        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/status", ['status' => 'suspended'])
            ->assertUnprocessable()->assertJsonPath('message', 'Give a reason for this change.');
        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/status", ['status' => 'prospect', 'reason' => 'x'])
            ->assertUnprocessable();

        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/status", ['status' => 'suspended', 'reason' => 'Unpaid invoice'])
            ->assertOk()->assertJsonPath('data.status', 'suspended')->assertJsonPath('data.suspensionReason', 'Unpaid invoice');
        Notification::assertSentTo(User::query()->where('email', 'admin@demo.com')->first(), InstitutionStatusChanged::class);

        // An existing session is blocked at once; signing in is refused; the data is still there.
        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/auth/me')->assertForbidden()->assertJsonPath('code', 'institution_inactive');
        $this->postJson('/api/v1/auth/login', ['email' => 'student@demo.com', 'password' => 'demo123'])->assertForbidden();
        $this->assertGreaterThan(0, \App\Models\Student::query()->withoutGlobalScopes()->where('institution_id', $institution)->count());

        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/status", ['status' => 'active', 'reason' => 'Paid'])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/auth/me')->assertOk();

        $history = $this->as('owner@test.dev')->getJson("/api/v1/owner/institutions/{$institution}/history")->assertOk()->json('data.status');
        $this->assertSame(['active', 'suspended'], array_slice(array_column($history, 'to'), 0, 2));
    }

    public function test_scheduled_suspension_and_verification(): void
    {
        Notification::fake();
        $institution = Institution::defaultId();

        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/status", [
            'status' => 'suspended', 'reason' => 'Contract ends', 'effectiveAt' => now()->addDays(2)->toIso8601String(),
        ])->assertOk()->assertJsonPath('scheduled', true)->assertJsonPath('data.status', 'active')->assertJsonPath('data.scheduledChange.to', 'suspended');

        $this->travel(3)->days();
        $this->tokens = []; // the old tokens have expired
        $this->artisan('owner:apply-scheduled-status-changes')->assertSuccessful();
        $this->assertSame('suspended', Institution::query()->find($institution)->status);

        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/verify", ['status' => 'requires_information'])->assertUnprocessable();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/institutions/{$institution}/verify", ['status' => 'requires_information', 'note' => 'Upload the AICTE letter'])
            ->assertOk()->assertJsonPath('data.verificationStatus', 'requires_information');
    }

    public function test_platform_users_and_roles(): void
    {
        Notification::fake();

        $list = $this->as('owner@test.dev')->getJson('/api/v1/owner/users?search=demo.com')->assertOk();
        $this->assertGreaterThan(3, $list->json('meta.total'));
        $this->assertArrayNotHasKey('password', $list->json('data.0'));
        $show = $this->as('owner@test.dev')->getJson('/api/v1/owner/users/'.User::query()->where('email', 'admin@demo.com')->value('id'))->assertOk();
        $this->assertArrayNotHasKey('mfaSecret', $show->json('data'));

        // Only a Super Admin can add a Super Admin; staff invitations send a password link.
        $roleId = PlatformRole::query()->where('slug', 'support-manager')->value('id');
        $this->as('owner@test.dev')->postJson('/api/v1/owner/users/invitations', ['name' => 'New Staff', 'email' => 'new@test.dev', 'role' => 'platform_staff', 'platformRoleId' => $roleId])->assertCreated();
        Notification::assertSentTo(User::query()->withoutGlobalScopes()->where('email', 'new@test.dev')->first(), ResetPassword::class);

        // Suspending signs the user out; the last Super Admin cannot be suspended.
        $student = User::query()->where('email', 'student@demo.com')->value('id');
        $studentToken = $this->token('student@demo.com');
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$student}/status", ['status' => 'suspended'])->assertUnprocessable();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$student}/status", ['status' => 'suspended', 'reason' => 'Abuse report'])->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->app['auth']->forgetGuards();
        $this->withToken($studentToken)->getJson('/api/v1/auth/me')->assertUnauthorized();

        $second = $this->platformUser('owner2@test.dev', UserRole::SuperAdmin, null);
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$second->id}/status", ['status' => 'suspended', 'reason' => 'Left'])->assertOk();
        $owner = User::query()->withoutGlobalScopes()->where('email', 'owner@test.dev')->value('id');
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => 'owner2@test.dev', 'password' => 'demo123'])->assertForbidden(); // suspended
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$owner}/status", ['status' => 'suspended', 'reason' => 'x'])->assertUnprocessable(); // own account

        // Role preview, then saving removes the permission for everyone in the role.
        $preview = $this->as('owner@test.dev')->patchJson("/api/v1/owner/roles/{$roleId}?preview=1", ['permissions' => ['owner.dashboard.view']])->assertOk();
        $this->assertContains('owner.institutions.view', $preview->json('data.removed'));
        $this->assertContains('support@test.dev', array_column($preview->json('data.affectedUsers'), 'email'));
        $this->as('support@test.dev')->getJson('/api/v1/owner/institutions')->assertOk();
        $this->as('owner@test.dev')->patchJson("/api/v1/owner/roles/{$roleId}", ['permissions' => ['owner.dashboard.view']])->assertOk();
        $this->as('support@test.dev')->getJson('/api/v1/owner/institutions')->assertForbidden();

        $this->as('owner@test.dev')->deleteJson("/api/v1/owner/roles/{$roleId}")->assertConflict();
    }

    public function test_maintenance_mode_blocks_institution_users_but_not_platform_staff(): void
    {
        $adminToken = $this->token('admin@demo.com');

        $this->as('owner@test.dev')->putJson('/api/v1/owner/settings', ['maintenanceEnabled' => true, 'maintenanceMessage' => 'Upgrading until 6 pm'])
            ->assertOk()->assertJsonPath('data.maintenanceEnabled', true);

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/auth/me')->assertStatus(503)->assertJsonPath('message', 'Upgrading until 6 pm');
        $this->postJson('/api/v1/auth/login', ['email' => 'student@demo.com', 'password' => 'demo123'])->assertStatus(503);
        $this->as('owner@test.dev')->getJson('/api/v1/owner/settings')->assertOk();

        $log = AuditLog::query()->withoutGlobalScopes()->where('action', 'owner.settings_updated')->latest('id')->first();
        $this->assertFalse($log->old_values['maintenanceEnabled']);
        $this->assertTrue($log->new_values['maintenanceEnabled']);

        $this->as('owner@test.dev')->putJson('/api/v1/owner/settings', ['maintenanceEnabled' => false])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_two_step_verification_for_platform_staff(): void
    {
        // Requiring MFA needs the requester's own MFA first.
        $this->as('owner@test.dev')->putJson('/api/v1/owner/settings', ['mfaRequiredForPlatformStaff' => true])->assertUnprocessable();

        $secret = $this->as('owner@test.dev')->postJson('/api/v1/auth/mfa/setup')->assertOk()->json('data.secret');
        $this->as('owner@test.dev')->postJson('/api/v1/auth/mfa/confirm', ['code' => '000000'])->assertUnprocessable();
        $this->as('owner@test.dev')->postJson('/api/v1/auth/mfa/confirm', ['code' => Totp::code($secret)])->assertOk()->assertJsonPath('data.enabled', true);

        $this->app['auth']->forgetGuards();
        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'owner@test.dev', 'password' => 'demo123'])
            ->assertOk()->assertJsonPath('mfaRequired', true)->assertJsonMissingPath('token')->json('challengeToken');
        $this->postJson('/api/v1/auth/mfa/verify', ['challengeToken' => $challenge, 'code' => '123456'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/mfa/verify', ['challengeToken' => $challenge, 'code' => Totp::code($secret)])->assertOk()->assertJsonStructure(['token']);

        // With the policy on, staff without MFA are sent to set it up.
        $this->as('owner@test.dev')->putJson('/api/v1/owner/settings', ['mfaRequiredForPlatformStaff' => true])->assertOk();
        $this->as('support@test.dev')->getJson('/api/v1/owner/institutions')->assertForbidden()->assertJsonPath('code', 'mfa_setup_required');

        $this->assertTrue(LoginHistory::query()->where('email', 'owner@test.dev')->where('outcome', 'mfa_failed')->exists());
    }

    public function test_overview_alerts_and_login_history(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@demo.com', 'password' => 'wrong-password'])->assertUnprocessable();

        $summary = $this->as('owner@test.dev')->getJson('/api/v1/owner/dashboard/summary')->assertOk();
        $this->assertSame(Institution::query()->count(), $summary->json('data.institutions.total'));
        $this->assertSame(1, $summary->json('data.institutions.byStatus.active'));
        $this->assertGreaterThan(0, $summary->json('data.users.byRole.student'));
        $this->assertNotEmpty($summary->json('data.system.checks'));

        Institution::query()->whereKey(Institution::defaultId())->update(['verification_status' => 'pending']);
        $alerts = collect($this->as('owner@test.dev')->getJson('/api/v1/owner/dashboard/alerts')->assertOk()->json('data'));
        $this->assertTrue($alerts->contains('type', 'institution.verification'));

        $this->as('owner@test.dev')->getJson('/api/v1/owner/dashboard/trends')->assertOk()->assertJsonCount(12, 'data');
        $history = $this->as('owner@test.dev')->getJson('/api/v1/owner/login-history?outcome=failed')->assertOk();
        $this->assertSame('admin@demo.com', $history->json('data.0.email'));
        $this->assertTrue(LoginHistory::query()->where('email', 'owner@test.dev')->where('outcome', 'success')->exists());
        $this->as('owner@test.dev')->getJson('/api/v1/owner/system/health')->assertOk()->assertJsonStructure(['data' => ['status', 'checkedAt', 'checks']]);
    }

    /** @return array<string, mixed> */
    private function institutionPayload(): array
    {
        return [
            'name' => 'Lakeside College', 'code' => 'lakeside', 'institutionType' => 'college', 'officialEmail' => 'office@lakeside.test',
            'contactPhone' => '+91 98765 43210', 'country' => 'India', 'state' => 'Kerala', 'address' => 'Lake Road, Kochi', 'status' => 'trial',
            'adminName' => 'Dr. Principal', 'adminEmail' => 'principal@lakeside.test',
        ];
    }

    private function platformUser(string $email, UserRole $role, ?string $platformRole): User
    {
        $user = new User(['name' => $email, 'email' => $email, 'password' => 'demo123', 'role' => $role->value]);
        $user->forceFill(['institution_id' => null, 'platform_role_id' => $platformRole ? PlatformRole::query()->where('slug', $platformRole)->value('id') : null, 'email_verified_at' => now()])->save();

        return $user;
    }

    private function token(string $email): string
    {
        return $this->tokens[$email] ??= (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])->assertOk()->json('token');
    }

    private function as(string $email): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($email));
    }
}
