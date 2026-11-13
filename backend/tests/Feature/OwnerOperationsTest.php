<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ApiClient;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\PlatformRole;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Owner Dashboard SRS Release 1/2 parity & Release 4/5 operational workflows:
 * - Logo upload, per-institution settings overrides, resend invite, security events & incidents
 * - Sales CRM leads -> Onboarding pipeline -> Provisioned live Institution
 * - Support tickets, SLA deadlines, internal vs public replies & private attachments
 * - Integrations, one-time API keys, webhooks, backups/restore verification, data governance, CMS & releases
 */
class OwnerOperationsTest extends TestCase
{
    use RefreshDatabase;

    private const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Cache::flush();
        $this->platformUser('owner@test.dev', UserRole::SuperAdmin, null);
        $this->platformUser('tech@test.dev', UserRole::PlatformStaff, 'technical-admin');
        $this->platformUser('support@test.dev', UserRole::PlatformStaff, 'support-manager');
    }

    public function test_phase_a_institution_logo_settings_overrides_resend_invite_security_events_and_incidents(): void
    {
        Storage::fake('local');
        Notification::fake();

        $inst = Institution::query()->findOrFail(Institution::defaultId());
        $png = UploadedFile::fake()->createWithContent('crest.png', base64_decode(self::TINY_PNG_BASE64));

        // Logo upload, private authenticated delivery, and removal
        $this->as('owner@test.dev')
            ->post("/api/v1/owner/institutions/{$inst->id}/logo", ['logo' => $png])
            ->assertOk()
            ->assertJsonPath('data.logoUrl', fn ($val) => is_string($val) && str_contains($val, "/institutions/{$inst->id}/logo"));

        $logoRes = $this->as('owner@test.dev')->get("/api/v1/owner/institutions/{$inst->id}/logo")->assertOk();
        $logoRes->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->as('owner@test.dev')->deleteJson("/api/v1/owner/institutions/{$inst->id}/logo")
            ->assertOk()
            ->assertJsonPath('data.logoUrl', null);

        // Per-institution settings overrides + clearing back to defaults
        $this->as('owner@test.dev')->putJson("/api/v1/owner/institutions/{$inst->id}/settings", [
            'currency' => 'USD',
            'defaultTrialDays' => 21,
            'aiMonthlyQuota' => 5000,
        ])->assertOk()
            ->assertJsonPath('data.overrides.currency', 'USD')
            ->assertJsonPath('data.overrides.defaultTrialDays', 21);

        $this->as('owner@test.dev')->putJson("/api/v1/owner/institutions/{$inst->id}/settings", ['currency' => null])
            ->assertOk()
            ->assertJsonMissing(['currency' => 'USD']);

        // Resend invite sends password setup notification & rejects suspended accounts
        $admin = User::query()->withoutGlobalScopes()->where('email', 'admin@demo.com')->firstOrFail();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$admin->id}/resend-invite")->assertOk();
        Notification::assertSentTo($admin, VerifyAccountNotification::class);

        $admin->forceFill(['status' => 'suspended'])->save();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/users/{$admin->id}/resend-invite")->assertConflict();

        // Security events triage
        $event = SecurityEvent::query()->create([
            'institution_id' => $inst->id,
            'event_type' => 'brute_force_detected',
            'severity' => 'high',
            'email' => 'attacker@test.dev',
            'ip_address' => '203.0.113.10',
            'summary' => 'Repeated invalid login attempts detected.',
            'status' => 'open',
        ]);
        $this->as('tech@test.dev')->getJson('/api/v1/owner/security-events?severity=high')->assertOk()->assertJsonCount(1, 'data');
        $this->as('tech@test.dev')->patchJson("/api/v1/owner/security-events/{$event->id}", ['status' => 'resolved'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');

        // System incidents lifecycle
        $incident = $this->as('tech@test.dev')->postJson('/api/v1/owner/system/incidents', [
            'title' => 'AI latency spike',
            'severity' => 'high',
            'component' => 'ai',
            'summary' => 'Elevated Anthropic p95 latency.',
        ])->assertCreated()->json('data');

        $this->as('tech@test.dev')->patchJson("/api/v1/owner/system/incidents/{$incident['id']}", [
            'status' => 'resolved',
            'resolutionNote' => 'Switched fallback model route.',
        ])->assertOk()->assertJsonPath('data.status', 'resolved');
    }

    public function test_crm_lead_to_onboarding_pipeline_and_live_institution_conversion(): void
    {
        Notification::fake();

        $lead = $this->as('owner@test.dev')->postJson('/api/v1/owner/crm/leads', [
            'organizationName' => 'Horizon Engineering Institute',
            'contactName' => 'Dr. Meera Nair',
            'contactEmail' => 'meera@horizon.edu',
            'source' => 'referral',
            'expectedStudents' => 1200,
            'expectedMrr' => 24000,
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->postJson("/api/v1/owner/crm/leads/{$lead['id']}/activities", [
            'activityType' => 'demo',
            'summary' => 'Walked Placement Dean through ATS & AI Mock Interviews.',
            'outcome' => 'Positive',
        ])->assertOk()->assertJsonCount(1, 'data.activities');

        // Lost stage requires explicit lostReason
        $this->as('owner@test.dev')->patchJson("/api/v1/owner/crm/leads/{$lead['id']}", ['stage' => 'lost'])->assertUnprocessable();

        $onboarding = $this->as('owner@test.dev')->postJson("/api/v1/owner/crm/leads/{$lead['id']}/convert")
            ->assertCreated()
            ->json('data');
        $this->assertSame('agreement', $onboarding['stage']);
        $this->assertNotEmpty($onboarding['checklist']);

        // Cannot convert the same lead twice
        $this->as('owner@test.dev')->postJson("/api/v1/owner/crm/leads/{$lead['id']}/convert")->assertConflict();

        $firstItemId = $onboarding['checklist'][0]['id'];
        $this->as('owner@test.dev')->postJson("/api/v1/owner/onboarding/checklists/{$firstItemId}/toggle")
            ->assertOk()->assertJsonPath('data.isCompleted', true);

        // Blocking requires blockerReason
        $this->as('owner@test.dev')->patchJson("/api/v1/owner/onboarding/{$onboarding['id']}", ['status' => 'blocked'])
            ->assertUnprocessable();

        $converted = $this->as('owner@test.dev')->postJson("/api/v1/owner/onboarding/{$onboarding['id']}/convert-institution", [
            'code' => 'HORIZON01',
            'status' => 'trial',
        ])->assertCreated()->json('data');

        $this->assertSame('HORIZON01', $converted['onboarding']['institution']['code']);
        $provisionedAdmin = User::query()->withoutGlobalScopes()->where('email', 'meera@horizon.edu')->firstOrFail();
        $this->assertSame($converted['institutionId'], $provisionedAdmin->institution_id);
        Notification::assertSentTo($provisionedAdmin, VerifyAccountNotification::class);

        $this->as('owner@test.dev')->postJson("/api/v1/owner/onboarding/{$onboarding['id']}/convert-institution")
            ->assertConflict();
    }

    public function test_support_tickets_sla_internal_notes_and_private_attachments(): void
    {
        Storage::fake('local');

        $instId = Institution::defaultId();
        $ticket = $this->as('support@test.dev')->postJson('/api/v1/owner/support/tickets', [
            'institutionId' => $instId,
            'subject' => 'Placement drive export stalled',
            'description' => 'Timeout on large cohort export.',
            'category' => 'technical',
            'priority' => 'urgent',
        ])->assertCreated()->json('data');

        $this->assertNull($ticket['firstRespondedAt']);

        // Internal note must NOT trigger customer firstRespondedAt or move status out of open
        $this->as('support@test.dev')->postJson("/api/v1/owner/support/tickets/{$ticket['id']}/replies", [
            'body' => 'Internal triage: checking queue worker memory.',
            'isInternal' => true,
        ])->assertOk()
            ->assertJsonPath('data.firstRespondedAt', null)
            ->assertJsonPath('data.status', 'open');

        // Public reply with private disk attachment updates SLA first response & status
        $attachment = UploadedFile::fake()->createWithContent('worker.log', 'Worker timeout stacktrace');
        $replied = $this->as('support@test.dev')->post("/api/v1/owner/support/tickets/{$ticket['id']}/replies", [
            'body' => 'We increased export chunking limits and re-queued your job.',
            'isInternal' => false,
            'attachment' => $attachment,
        ])->assertOk()->json('data');

        $this->assertNotNull($replied['firstRespondedAt']);
        $this->assertSame('in_progress', $replied['status']);
        $this->assertCount(1, $replied['attachments']);

        $attId = $replied['attachments'][0]['id'];
        $download = $this->as('support@test.dev')->get("/api/v1/owner/support/attachments/{$attId}")->assertOk();
        $download->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->as('support@test.dev')->patchJson("/api/v1/owner/support/tickets/{$ticket['id']}", ['escalate' => true])
            ->assertOk()->assertJsonPath('data.escalationLevel', 1)->assertJsonPath('data.status', 'escalated');

        $this->as('support@test.dev')->patchJson("/api/v1/owner/support/tickets/{$ticket['id']}", [
            'status' => 'resolved',
            'csatScore' => 5,
            'csatComment' => 'Resolved rapidly.',
        ])->assertOk()->assertJsonPath('data.csatScore', 5);
    }

    public function test_integrations_api_clients_webhooks_backups_data_requests_and_content_modules(): void
    {
        // Support Manager must NOT access integrations or data management
        $this->as('support@test.dev')->getJson('/api/v1/owner/integrations')->assertForbidden();
        $this->as('support@test.dev')->getJson('/api/v1/owner/data/backups')->assertForbidden();

        // Integrations hide secrets
        $integrationRes = $this->as('tech@test.dev')->postJson('/api/v1/owner/integrations', [
            'key' => 'stripe_live',
            'name' => 'Stripe Gateway',
            'category' => 'payment',
            'provider' => 'Stripe',
            'status' => 'active',
            'secret' => 'sk_live_very_secret_9876',
        ])->assertCreated();
        $this->assertStringNotContainsString('sk_live_very_secret_9876', json_encode($integrationRes->json()));
        $this->as('tech@test.dev')->postJson("/api/v1/owner/integrations/{$integrationRes->json('data.id')}/test")
            ->assertOk()->assertJsonPath('data.lastTestStatus', 'ok');

        // API Client returns plainKey ONLY on creation, persists hash, supports revoke
        $clientRes = $this->as('tech@test.dev')->postJson('/api/v1/owner/api-clients', [
            'name' => 'SIS Sync Agent',
            'institutionId' => Institution::defaultId(),
            'scopes' => ['students:read'],
            'rateLimitPerMin' => 120,
        ])->assertCreated();
        $plainKey = $clientRes->json('plainKey');
        $this->assertStringStartsWith('agk_', $plainKey);
        $stored = ApiClient::query()->findOrFail($clientRes->json('data.id'));
        $this->assertSame(hash('sha256', $plainKey), $stored->key_hash);
        $this->assertStringNotContainsString($plainKey, json_encode($this->as('tech@test.dev')->getJson('/api/v1/owner/api-clients')->assertOk()->json()));
        $this->as('tech@test.dev')->postJson("/api/v1/owner/api-clients/{$stored->id}/revoke")
            ->assertOk()->assertJsonPath('data.status', 'revoked');

        // Webhooks & test delivery
        $wh = $this->as('tech@test.dev')->postJson('/api/v1/owner/webhooks', [
            'name' => 'ERP Webhook',
            'url' => 'https://erp.example.edu/hooks/alphagrew',
            'events' => ['invoice.paid'],
        ])->assertCreated()->json('data');
        $this->as('tech@test.dev')->postJson("/api/v1/owner/webhooks/{$wh['id']}/test")
            ->assertOk()->assertJsonPath('data.lastStatusCode', 200);

        // Backups & Restore verification
        $backup = $this->as('tech@test.dev')->postJson('/api/v1/owner/data/backups', [
            'backupType' => 'full',
            'scope' => 'platform',
        ])->assertCreated()->json('data');
        $this->as('tech@test.dev')->postJson("/api/v1/owner/data/backups/{$backup['id']}/verify", [
            'outcome' => 'passed',
            'notes' => 'Restored snapshot checksum matched.',
        ])->assertOk()->assertJsonPath('data.verified', true);

        // Deletion request requires exact "DELETE <CODE>" confirmation
        $inst = Institution::query()->findOrFail(Institution::defaultId());
        $dataReq = $this->as('owner@test.dev')->postJson('/api/v1/owner/data/requests', [
            'institutionId' => $inst->id,
            'requestType' => 'deletion',
            'reason' => 'End of pilot cleanup verification.',
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->postJson("/api/v1/owner/data/requests/{$dataReq['id']}/review", [
            'status' => 'approved',
            'confirmation' => 'WRONG CONFIRMATION',
        ])->assertUnprocessable();

        $this->as('owner@test.dev')->postJson("/api/v1/owner/data/requests/{$dataReq['id']}/review", [
            'status' => 'approved',
            'confirmation' => "DELETE {$inst->code}",
        ])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertTrue(AuditLog::query()->withoutGlobalScopes()->where('action', 'owner.data_request_reviewed')->exists());

        // Announcements, CMS revisions, and independent Product Release deploy/publication tracking
        $this->as('owner@test.dev')->postJson('/api/v1/owner/announcements', [
            'title' => 'AI Placement Season Upgrade',
            'body' => 'New recruiter matching insights now live.',
            'category' => 'release',
            'priority' => 'normal',
            'channels' => ['in_app'],
            'targetScope' => 'all',
            'status' => 'published',
        ])->assertCreated()->assertJsonPath('data.status', 'published');

        $cms = $this->as('owner@test.dev')->postJson('/api/v1/owner/cms/pages', [
            'contentType' => 'faq',
            'slug' => 'ai-interview-fairness',
            'title' => 'AI Interview Fairness Policy',
            'body' => 'Initial v1 explanation.',
            'status' => 'draft',
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->patchJson("/api/v1/owner/cms/pages/{$cms['id']}", [
            'body' => 'Updated v2 clarity.',
            'status' => 'published',
            'changeNote' => 'Added campus rubric details',
        ])->assertOk()->assertJsonPath('data.currentVersion', 2)->assertJsonCount(2, 'data.revisions');

        $release = $this->as('owner@test.dev')->postJson('/api/v1/owner/releases', [
            'version' => 'v2.4.0',
            'title' => 'Owner Console Complete Parity',
            'releaseType' => 'minor',
            'deploymentStatus' => 'staging',
            'publicationStatus' => 'draft',
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->patchJson("/api/v1/owner/releases/{$release['id']}", [
            'deploymentStatus' => 'deployed',
            'publicationStatus' => 'published',
        ])->assertOk()
            ->assertJsonPath('data.deploymentStatus', 'deployed')
            ->assertJsonPath('data.publicationStatus', 'published');
    }

    public function test_tickets_can_only_be_assigned_to_platform_staff(): void
    {
        $ticket = $this->as('support@test.dev')->postJson('/api/v1/owner/support/tickets', [
            'institutionId' => Institution::defaultId(),
            'subject' => 'Login issue',
            'description' => 'A student cannot sign in.',
            'category' => 'technical',
            'priority' => 'medium',
        ])->assertCreated()->json('data');

        $campusAdmin = User::query()->withoutGlobalScopes()->where('email', 'admin@demo.com')->firstOrFail();
        $this->as('support@test.dev')->patchJson("/api/v1/owner/support/tickets/{$ticket['id']}", ['assignedTo' => $campusAdmin->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('assignedTo');

        $tech = User::query()->withoutGlobalScopes()->where('email', 'tech@test.dev')->firstOrFail();
        $this->as('support@test.dev')->patchJson("/api/v1/owner/support/tickets/{$ticket['id']}", ['assignedTo' => $tech->id])
            ->assertOk();
    }

    private function platformUser(string $email, UserRole $role, ?string $roleSlug): User
    {
        $roleId = $roleSlug ? PlatformRole::query()->where('slug', $roleSlug)->value('id') : null;
        $user = new User(['name' => $email, 'email' => $email, 'password' => 'secret123', 'role' => $role->value]);
        $user->forceFill([
            'institution_id' => null,
            'platform_role_id' => $roleId,
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
