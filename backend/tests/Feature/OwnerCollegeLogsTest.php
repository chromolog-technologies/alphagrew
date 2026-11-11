<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\AiUsageLog;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\LoginHistory;
use App\Models\PlatformRole;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\Owner\OwnerPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Verifies unified college logs across all 7 platform/tenant log streams,
 * cross-tenant activity/security/session filtering, secret redaction, and OwnerPermission gating.
 */
class OwnerCollegeLogsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Cache::flush();
        $this->platformUser('owner@test.dev', UserRole::SuperAdmin, null);
        $this->platformUser('support@test.dev', UserRole::PlatformStaff, 'support-manager');
        $this->platformUser('auditor@test.dev', UserRole::PlatformStaff, 'security-auditor');
    }

    public function test_super_admin_receives_all_seven_log_streams_for_a_college_with_redaction_and_tenant_scoping(): void
    {
        Notification::fake();

        $riversideRes = $this->as('owner@test.dev')->postJson('/api/v1/owner/institutions', [
            'name' => 'Riverside Institute of Technology',
            'code' => 'riverside',
            'institutionType' => 'college',
            'officialEmail' => 'office@riverside.edu',
            'contactPhone' => '+91 98765 43210',
            'country' => 'India',
            'state' => 'Maharashtra',
            'address' => 'Pune, India',
            'status' => 'active',
            'adminName' => 'Meera Kulkarni',
            'adminEmail' => 'riverside.admin@demo.com',
        ])->assertCreated();
        $riversideId = (int) $riversideRes->json('data.id');

        $lakesideRes = $this->as('owner@test.dev')->postJson('/api/v1/owner/institutions', [
            'name' => 'Lakeside College',
            'code' => 'lakeside',
            'institutionType' => 'college',
            'officialEmail' => 'office@lakeside.edu',
            'contactPhone' => '+91 98765 43211',
            'country' => 'India',
            'state' => 'Kerala',
            'address' => 'Kochi, India',
            'status' => 'active',
            'adminName' => 'Ravi Menon',
            'adminEmail' => 'lakeside.admin@demo.com',
        ])->assertCreated();
        $lakesideId = (int) $lakesideRes->json('data.id');

        $meera = User::query()->withoutGlobalScopes()->where('email', 'riverside.admin@demo.com')->firstOrFail();
        $ravi = User::query()->withoutGlobalScopes()->where('email', 'lakeside.admin@demo.com')->firstOrFail();
        $owner = User::query()->withoutGlobalScopes()->where('email', 'owner@test.dev')->firstOrFail();

        // Active tokens for session filtering test
        $meera->createToken('web-riverside');
        $ravi->createToken('web-lakeside');

        // 1. Audit log (with sensitive keys that must be redacted)
        AuditLog::query()->withoutGlobalScopes()->create([
            'institution_id' => $riversideId,
            'actor_id' => $owner->id,
            'action' => 'owner.api_credential_rotated',
            'subject_type' => User::class,
            'subject_id' => $meera->id,
            'old_values' => ['api_token' => 'old-token-value', 'note' => 'before'],
            'new_values' => ['api_token' => 'top-secret-token-999', 'secret_key' => 'super-secret-xyz', 'note' => 'after'],
            'ip_address' => '192.0.2.10',
        ]);
        AuditLog::query()->withoutGlobalScopes()->create([
            'institution_id' => $lakesideId,
            'actor_id' => $owner->id,
            'action' => 'lakeside.only_audit_event',
            'ip_address' => '192.0.2.11',
        ]);

        // 2. Activity log (with password & mfa_secret keys that must be redacted)
        ActivityLog::query()->withoutGlobalScopes()->create([
            'institution_id' => $riversideId,
            'user_id' => $meera->id,
            'action' => 'updated',
            'model_type' => User::class,
            'model_id' => $meera->id,
            'changes' => [
                'old' => ['name' => 'Meera K.'],
                'new' => ['name' => 'Meera Kulkarni', 'password' => 'my-plain-password', 'mfa_secret' => 'TOTP-RAW-SECRET'],
            ],
            'ip_address' => '198.51.100.22',
            'user_agent' => 'Mozilla/5.0',
        ]);
        ActivityLog::query()->withoutGlobalScopes()->create([
            'institution_id' => $lakesideId,
            'user_id' => $ravi->id,
            'action' => 'updated',
            'model_type' => User::class,
            'model_id' => $ravi->id,
            'changes' => ['new' => ['name' => 'LakesideLeakMarker']],
        ]);

        // 3. Login history
        LoginHistory::query()->create([
            'user_id' => $meera->id,
            'institution_id' => $riversideId,
            'email' => 'riverside.admin@demo.com',
            'outcome' => 'success',
            'ip_address' => '198.51.100.22',
            'created_at' => now(),
        ]);
        LoginHistory::query()->create([
            'user_id' => $ravi->id,
            'institution_id' => $lakesideId,
            'email' => 'lakeside.admin@demo.com',
            'outcome' => 'failed',
            'ip_address' => '198.51.100.99',
            'created_at' => now(),
        ]);

        // 4. Security event
        SecurityEvent::query()->create([
            'institution_id' => $riversideId,
            'user_id' => $meera->id,
            'email' => 'riverside.admin@demo.com',
            'event_type' => 'impossible_travel',
            'severity' => 'high',
            'status' => 'open',
            'ip_address' => '203.0.113.45',
            'summary' => 'Riverside impossible travel alert',
        ]);
        SecurityEvent::query()->create([
            'institution_id' => $lakesideId,
            'user_id' => $ravi->id,
            'email' => 'lakeside.admin@demo.com',
            'event_type' => 'brute_force_detected',
            'severity' => 'critical',
            'status' => 'open',
            'summary' => 'LakesideSecurityMarker',
        ]);

        // 5. Status / verification event
        InstitutionStatusEvent::query()->create([
            'institution_id' => $riversideId,
            'kind' => 'verification',
            'from_status' => 'pending',
            'to_status' => 'verified',
            'reason' => 'NAAC accreditation certificate approved',
            'effective_at' => now(),
            'applied' => true,
            'actor_id' => $owner->id,
            'created_at' => now(),
        ]);

        // 6. Plan & Subscription (auto-creates SubscriptionEvent)
        $plan = $this->as('owner@test.dev')->postJson('/api/v1/owner/plans', [
            'code' => 'RIV_PRO',
            'name' => 'Riverside Pro Plan',
            'status' => 'active',
            'billingCycle' => 'monthly',
            'price' => 48000,
            'currency' => 'INR',
            'trialDays' => 14,
            'aiCreditAllocation' => 2500,
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->postJson('/api/v1/owner/subscriptions', [
            'institutionId' => $riversideId,
            'planId' => $plan['id'],
            'status' => 'active',
            'generateInvoice' => false,
        ])->assertCreated();

        // 7. AI usage log
        AiUsageLog::query()->create([
            'institution_id' => $riversideId,
            'user_id' => $meera->id,
            'feature' => 'resume_analysis',
            'provider' => 'anthropic',
            'model' => 'claude-3-5-sonnet',
            'status' => 'success',
            'prompt_tokens' => 420,
            'completion_tokens' => 180,
            'latency_ms' => 610,
            'credits_charged' => 3,
            'estimated_cost_usd' => 0.0085,
            'created_at' => now(),
        ]);

        // Fetch unified college logs bundle for Riverside
        $bundle = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/institutions/{$riversideId}/logs")
            ->assertOk()
            ->assertJsonPath('data.institution.id', $riversideId)
            ->assertJsonPath('data.institution.name', 'Riverside Institute of Technology');

        $counts = $bundle->json('data.counts');
        $this->assertGreaterThanOrEqual(1, $counts['audit']);
        $this->assertGreaterThanOrEqual(1, $counts['activity']);
        $this->assertGreaterThanOrEqual(1, $counts['login']);
        $this->assertGreaterThanOrEqual(1, $counts['security']);
        $this->assertGreaterThanOrEqual(1, $counts['status']);
        $this->assertGreaterThanOrEqual(1, $counts['subscription']);
        $this->assertGreaterThanOrEqual(1, $counts['ai']);
        $this->assertSame(
            $counts['audit'] + $counts['activity'] + $counts['login'] + $counts['security'] + $counts['status'] + $counts['subscription'] + $counts['ai'],
            $counts['total']
        );

        $timelineCategories = array_unique(array_column($bundle->json('data.timeline'), 'category'));
        foreach (['audit', 'activity', 'login', 'security', 'status', 'subscription', 'ai'] as $expectedCategory) {
            $this->assertContains($expectedCategory, $timelineCategories);
        }

        // Redaction and cross-tenant isolation guarantees
        $encoded = json_encode($bundle->json('data'));
        $this->assertStringNotContainsString('top-secret-token-999', $encoded);
        $this->assertStringNotContainsString('super-secret-xyz', $encoded);
        $this->assertStringNotContainsString('my-plain-password', $encoded);
        $this->assertStringNotContainsString('TOTP-RAW-SECRET', $encoded);
        $this->assertStringContainsString('[redacted]', $encoded);

        $this->assertStringNotContainsString('lakeside.only_audit_event', $encoded);
        $this->assertStringNotContainsString('LakesideLeakMarker', $encoded);
        $this->assertStringNotContainsString('LakesideSecurityMarker', $encoded);
        $this->assertStringNotContainsString('lakeside.admin@demo.com', $encoded);

        // Search and category filters on /logs
        $searched = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/institutions/{$riversideId}/logs?search=NAAC")
            ->assertOk();
        $this->assertGreaterThanOrEqual(1, count($searched->json('data.status')));
        $this->assertCount(0, $searched->json('data.ai'));

        $aiOnly = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/institutions/{$riversideId}/logs?category=ai")
            ->assertOk();
        foreach ($aiOnly->json('data.timeline') as $row) {
            $this->assertSame('ai', $row['category']);
        }

        // Cross-tenant endpoints with institutionId filter & redaction
        $activityPage = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/activity-logs?institutionId={$riversideId}")
            ->assertOk();
        $this->assertCount(1, $activityPage->json('data'));
        $this->assertStringNotContainsString('my-plain-password', json_encode($activityPage->json('data')));
        $this->assertStringContainsString('[redacted]', json_encode($activityPage->json('data')));

        $securityPage = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/security-events?institutionId={$riversideId}")
            ->assertOk();
        $this->assertCount(1, $securityPage->json('data'));
        $this->assertSame('Riverside impossible travel alert', $securityPage->json('data.0.summary'));

        $sessionsRes = $this->as('owner@test.dev')
            ->getJson("/api/v1/owner/sessions?institutionId={$riversideId}")
            ->assertOk();
        $sessionEmails = array_filter(array_map(fn ($s) => $s['user']['email'] ?? null, $sessionsRes->json('data')));
        $this->assertContains('riverside.admin@demo.com', $sessionEmails);
        $this->assertNotContains('lakeside.admin@demo.com', $sessionEmails);
    }

    public function test_college_logs_enforce_platform_access_and_per_category_permissions(): void
    {
        $institutionId = Institution::defaultId();
        $admin = User::query()->where('institution_id', $institutionId)->firstOrFail();

        SecurityEvent::query()->create([
            'institution_id' => $institutionId,
            'user_id' => $admin->id,
            'email' => $admin->email,
            'event_type' => 'failed_login_burst',
            'severity' => 'medium',
            'status' => 'open',
            'summary' => 'Spike in bad passwords',
        ]);
        LoginHistory::query()->create([
            'user_id' => $admin->id,
            'institution_id' => $institutionId,
            'email' => $admin->email,
            'outcome' => 'failed',
            'created_at' => now(),
        ]);
        AiUsageLog::query()->create([
            'institution_id' => $institutionId,
            'user_id' => $admin->id,
            'feature' => 'interview_turn',
            'provider' => 'anthropic',
            'model' => 'claude-3-5-sonnet',
            'status' => 'success',
            'prompt_tokens' => 50,
            'completion_tokens' => 40,
            'latency_ms' => 210,
            'credits_charged' => 1,
            'estimated_cost_usd' => 0.001,
            'created_at' => now(),
        ]);
        ActivityLog::query()->withoutGlobalScopes()->create([
            'institution_id' => $institutionId,
            'user_id' => $admin->id,
            'action' => 'updated',
            'model_type' => User::class,
            'model_id' => $admin->id,
            'changes' => ['new' => ['status' => 'active']],
        ]);

        // Unauthenticated
        $this->getJson("/api/v1/owner/institutions/{$institutionId}/logs")->assertUnauthorized();
        $this->getJson('/api/v1/owner/activity-logs')->assertUnauthorized();

        // Campus admin rejected
        $this->as('admin@demo.com')->getJson("/api/v1/owner/institutions/{$institutionId}/logs")
            ->assertForbidden()
            ->assertJsonPath('code', 'not_platform_user');
        $this->as('admin@demo.com')->getJson('/api/v1/owner/activity-logs')
            ->assertForbidden()
            ->assertJsonPath('code', 'not_platform_user');

        // Support Manager lacks owner.audit.view
        $this->as('support@test.dev')->getJson("/api/v1/owner/institutions/{$institutionId}/logs")
            ->assertForbidden()
            ->assertJsonPath('code', 'owner_permission_denied');
        $this->as('support@test.dev')->getJson('/api/v1/owner/activity-logs')
            ->assertForbidden()
            ->assertJsonPath('code', 'owner_permission_denied');

        // Staff role holding ONLY owner.audit.view can read audit/activity/status, not security/logins/ai/subscription
        $auditOnlyRole = PlatformRole::query()->create([
            'name' => 'Audit Only',
            'slug' => 'audit-only-test',
            'description' => 'Read audit & activity only',
            'permissions' => [OwnerPermission::AUDIT_VIEW],
            'is_system' => false,
        ]);
        $auditOnlyUser = $this->platformUser('auditonly@test.dev', UserRole::PlatformStaff, null);
        $auditOnlyUser->forceFill(['platform_role_id' => $auditOnlyRole->id])->save();

        $partial = $this->as('auditonly@test.dev')
            ->getJson("/api/v1/owner/institutions/{$institutionId}/logs")
            ->assertOk();
        $this->assertGreaterThanOrEqual(1, $partial->json('data.counts.activity'));
        $this->assertSame(0, $partial->json('data.counts.login'));
        $this->assertSame(0, $partial->json('data.counts.security'));
        $this->assertSame(0, $partial->json('data.counts.subscription'));
        $this->assertSame(0, $partial->json('data.counts.ai'));
        $this->assertSame([], $partial->json('data.logins'));
        $this->assertSame([], $partial->json('data.security'));
        $this->assertSame([], $partial->json('data.ai'));

        // Security Auditor holds audit + security + subscriptions + ai view permissions
        $fullAuditor = $this->as('auditor@test.dev')
            ->getJson("/api/v1/owner/institutions/{$institutionId}/logs")
            ->assertOk();
        $this->assertGreaterThanOrEqual(1, $fullAuditor->json('data.counts.login'));
        $this->assertGreaterThanOrEqual(1, $fullAuditor->json('data.counts.security'));
        $this->assertGreaterThanOrEqual(1, $fullAuditor->json('data.counts.ai'));
    }

    private function platformUser(string $email, UserRole $role, ?string $platformRoleSlug): User
    {
        $user = new User(['name' => $email, 'email' => $email, 'password' => 'demo123', 'role' => $role->value]);
        $user->forceFill([
            'institution_id' => null,
            'platform_role_id' => $platformRoleSlug ? PlatformRole::query()->where('slug', $platformRoleSlug)->value('id') : null,
            'email_verified_at' => now(),
        ])->save();

        return $user;
    }

    private function as(string $email): static
    {
        $user = User::query()->withoutGlobalScopes()->where('email', $email)->firstOrFail();
        $token = $user->createToken('test')->plainTextToken;
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }
}
