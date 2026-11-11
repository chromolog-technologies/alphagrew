<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ExportJob;
use App\Models\Institution;
use App\Models\PlatformRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Owner Dashboard SRS Release 3:
 * Read-only aggregated Product Oversight (SRS §5.10–§5.14) and Reports & Exports Hub (§5.15, §13).
 */
class OwnerOversightAndReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Cache::flush();
        $this->platformUser('owner@test.dev', UserRole::SuperAdmin, null);
        $this->platformUser('support@test.dev', UserRole::PlatformStaff, 'support-manager');
        $this->platformUser('cs@test.dev', UserRole::PlatformStaff, 'customer-success');
    }

    public function test_oversight_endpoints_enforce_permissions_and_privacy_boundaries(): void
    {
        foreach (['academic', 'placement', 'assessments', 'resumes', 'interviews'] as $section) {
            $this->as('admin@demo.com')
                ->getJson("/api/v1/owner/oversight/{$section}")
                ->assertForbidden()
                ->assertJsonPath('code', 'not_platform_user');
        }

        // Academic, Placement, Assessments return aggregated totals without mutating tenant records.
        $academic = $this->as('owner@test.dev')->getJson('/api/v1/owner/oversight/academic')->assertOk();
        $this->assertGreaterThanOrEqual(1, $academic->json('data.totals.institutions'));
        $this->assertIsArray($academic->json('data.institutions'));

        $this->as('owner@test.dev')->getJson('/api/v1/owner/oversight/placement')->assertOk()
            ->assertJsonStructure(['data' => ['totals' => ['companies', 'drives', 'applications', 'placements', 'placementRatePercent'], 'institutions']]);

        $this->as('owner@test.dev')->getJson('/api/v1/owner/oversight/assessments')->assertOk()
            ->assertJsonStructure(['data' => ['readOnlyNotice', 'totals' => ['exams', 'markEntries', 'passRatePercent'], 'institutions']]);

        // Resume AI & AI Interviews include privacy/assistive disclaimers and never expose raw files/transcripts.
        $resumes = $this->as('owner@test.dev')->getJson('/api/v1/owner/oversight/resumes')->assertOk()
            ->assertJsonStructure(['data' => ['privacyNotice', 'totals' => ['uploads', 'parsed', 'failed', 'analyses', 'avgOverallScore', 'avgAtsScore'], 'institutions']]);
        $resumePayload = json_encode($resumes->json('data'));
        $this->assertStringNotContainsString('rawText', $resumePayload);
        $this->assertStringNotContainsString('filePath', $resumePayload);

        $interviews = $this->as('owner@test.dev')->getJson('/api/v1/owner/oversight/interviews')->assertOk()
            ->assertJsonStructure(['data' => ['disclaimer', 'totals' => ['sessions', 'completed', 'evaluated', 'avgScore'], 'byMode', 'institutions']]);
        $interviewDataPayload = json_encode([
            'totals' => $interviews->json('data.totals'),
            'byMode' => $interviews->json('data.byMode'),
            'institutions' => $interviews->json('data.institutions'),
        ]);
        $this->assertStringNotContainsString('transcript', $interviewDataPayload);
        $this->assertStringNotContainsString('audioPath', $interviewDataPayload);
    }

    public function test_reports_catalog_previews_all_eleven_srs_reports_and_permission_checks(): void
    {
        // Support Manager lacks reports permission; Customer Success can view/preview but cannot export.
        $this->as('support@test.dev')->getJson('/api/v1/owner/reports/catalog')->assertForbidden()->assertJsonPath('code', 'owner_permission_denied');
        $this->as('cs@test.dev')->getJson('/api/v1/owner/reports/preview?reportKey=institution')->assertOk();
        $this->as('cs@test.dev')->get('/api/v1/owner/reports/export?reportKey=institution&format=csv')->assertForbidden();

        $catalog = $this->as('owner@test.dev')->getJson('/api/v1/owner/reports/catalog')->assertOk()->json('data');
        $this->assertCount(11, $catalog);

        $expectedKeys = ['institution', 'user', 'subscription', 'revenue', 'ai_usage', 'placement', 'assessment', 'resume', 'interview', 'support', 'system'];
        $this->assertSame($expectedKeys, array_column($catalog, 'key'));

        foreach ($expectedKeys as $key) {
            $res = $this->as('owner@test.dev')->getJson("/api/v1/owner/reports/preview?reportKey={$key}")->assertOk();
            $this->assertSame($key, $res->json('data.key'));
            $this->assertNotEmpty($res->json('data.columns'));
            $this->assertIsArray($res->json('data.rows'));
        }
    }

    public function test_report_exports_sanitize_csv_formulas_record_export_jobs_and_manage_saved_and_scheduled_reports(): void
    {
        // Formula injection neutralization on exported institution names.
        Institution::query()->create([
            'name' => '=cmd|calc',
            'code' => 'FRM01',
            'slug' => 'frm-01',
            'status' => 'active',
            'institution_type' => 'college',
            'official_email' => 'office@formula.test',
            'country' => 'India',
            'verification_status' => 'verified',
        ]);

        $csvRes = $this->as('owner@test.dev')
            ->get('/api/v1/owner/reports/export?reportKey=institution&format=csv')
            ->assertOk();
        $csvRes->assertHeader('X-Content-Type-Options', 'nosniff');
        $csvBody = $csvRes->streamedContent();
        $this->assertStringContainsString("'=cmd|calc", $csvBody);

        $htmlRes = $this->as('owner@test.dev')
            ->get('/api/v1/owner/reports/export?reportKey=institution&format=html')
            ->assertOk();
        $this->assertStringContainsString('Institution Master & Health', $htmlRes->getContent());

        $this->assertSame(2, ExportJob::query()->count());
        $this->assertTrue(AuditLog::query()->withoutGlobalScopes()->where('action', 'owner.report_exported')->exists());

        $exports = $this->as('owner@test.dev')->getJson('/api/v1/owner/reports/exports')->assertOk();
        $this->assertCount(2, $exports->json('data'));

        // Saved view CRUD
        $saved = $this->as('owner@test.dev')->postJson('/api/v1/owner/reports/saved', [
            'name' => 'Quarterly Active Institutions',
            'reportKey' => 'institution',
            'filters' => ['status' => 'active'],
            'format' => 'csv',
        ])->assertCreated()->json('data');
        $this->as('owner@test.dev')->getJson('/api/v1/owner/reports/saved')->assertOk()->assertJsonFragment(['name' => 'Quarterly Active Institutions']);
        $this->as('owner@test.dev')->deleteJson("/api/v1/owner/reports/saved/{$saved['id']}")->assertOk();

        // Schedule CRUD
        $sched = $this->as('owner@test.dev')->postJson('/api/v1/owner/reports/schedules', [
            'name' => 'Weekly Placement Digest',
            'reportKey' => 'placement',
            'frequency' => 'weekly',
            'format' => 'html',
            'recipients' => ['ops@alphagrew.test'],
        ])->assertCreated()->json('data');
        $this->as('owner@test.dev')->patchJson("/api/v1/owner/reports/schedules/{$sched['id']}", ['isActive' => false])
            ->assertOk()->assertJsonPath('data.isActive', false);
        $this->as('owner@test.dev')->deleteJson("/api/v1/owner/reports/schedules/{$sched['id']}")->assertOk();
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
