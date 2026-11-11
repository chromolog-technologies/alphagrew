<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\LoginHistory;
use App\Models\PlatformRole;
use App\Models\User;
use App\Services\Owner\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthPortalSeparationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(\Database\Seeders\OwnerDemoSeeder::class);
    }

    public function test_campus_login_accepts_campus_accounts_and_refuses_platform_accounts(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@demo.com',
            'password' => 'demo123',
            'portal' => 'campus',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.role', UserRole::InstitutionAdmin->value);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@demo.com',
            'password' => 'demo123',
            'portal' => 'campus',
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'use_owner_login');

        $this->assertFalse(
            User::query()->withoutGlobalScopes()->where('email', 'platform@demo.com')->exists(),
            'Demo seeder only seeds the single owner@demo.com platform owner.',
        );

        $this->assertTrue(
            LoginHistory::query()
                ->where('email', 'owner@demo.com')
                ->where('outcome', 'refused')
                ->exists()
        );
    }

    public function test_owner_login_accepts_platform_accounts_and_refuses_campus_accounts(): void
    {
        $this->postJson('/api/v1/owner/auth/login', [
            'email' => 'owner@demo.com',
            'password' => 'demo123',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['ownerPermissions', 'mfaEnabled']])
            ->assertJsonPath('user.role', UserRole::SuperAdmin->value);

        $this->postJson('/api/v1/owner/auth/login', [
            'email' => 'admin@demo.com',
            'password' => 'demo123',
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'use_campus_login');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'student@demo.com',
            'password' => 'demo123',
            'portal' => 'owner',
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'use_campus_login');
    }

    public function test_wrong_password_does_not_leak_portal_role(): void
    {
        $this->postJson('/api/v1/owner/auth/login', [
            'email' => 'student@demo.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonMissingPath('code');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@demo.com',
            'password' => 'wrong-password',
            'portal' => 'campus',
        ])
            ->assertUnprocessable()
            ->assertJsonMissingPath('code');
    }

    public function test_owner_login_supports_mfa_challenge_and_maintenance_mode(): void
    {
        $owner = User::query()->withoutGlobalScopes()->where('email', 'owner@demo.com')->firstOrFail();
        $secret = Totp::generateSecret();
        $owner->forceFill(['mfa_secret' => $secret, 'mfa_enabled_at' => now()])->save();

        // Turn maintenance mode on: campus login returns 503 while /owner/auth/login stays open for platform staff.
        \App\Models\PlatformSetting::put(['maintenanceEnabled' => true, 'maintenanceMessage' => 'Scheduled maintenance'], $owner->id);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'student@demo.com',
            'password' => 'demo123',
            'portal' => 'campus',
        ])->assertStatus(503);

        $challenge = $this->postJson('/api/v1/owner/auth/login', [
            'email' => 'owner@demo.com',
            'password' => 'demo123',
        ])
            ->assertOk()
            ->assertJsonPath('mfaRequired', true)
            ->assertJsonMissingPath('token')
            ->json('challengeToken');

        $this->postJson('/api/v1/auth/mfa/verify', [
            'challengeToken' => $challenge,
            'code' => Totp::code($secret),
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.role', UserRole::SuperAdmin->value);
    }

    public function test_omitting_portal_keeps_existing_api_compatibility(): void
    {
        $role = PlatformRole::query()->where('slug', 'platform-manager')->firstOrFail();
        $staff = (new User())->forceFill([
            'name' => 'Legacy Platform Staff',
            'email' => 'legacy-staff@test.dev',
            'password' => 'demo123',
            'role' => UserRole::PlatformStaff->value,
            'platform_role_id' => $role->id,
            'institution_id' => null,
            'email_verified_at' => now(),
            'status' => 'active',
        ]);
        $staff->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@demo.com',
            'password' => 'demo123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', UserRole::SuperAdmin->value);

        $this->postJson('/api/v1/auth/login', [
            'email' => $staff->email,
            'password' => 'demo123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', UserRole::PlatformStaff->value);
    }
}

