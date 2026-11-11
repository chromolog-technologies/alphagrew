<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\JobApplication;
use App\Models\PlacementPolicy;
use App\Models\Student;
use App\Models\User;
use App\Notifications\Placement\ApplicationStatusChanged;
use App\Notifications\Placement\JobPublished;
use App\Notifications\Placement\OfferIssued;
use App\Notifications\Placement\RoundScheduled;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\BuildsPlacementFixtures;
use Tests\TestCase;

/**
 * PRD v1.1 §6 and §10: jobs with deterministic eligibility, the application pipeline, rounds,
 * offers, placement policies and the notifications they send.
 */
class PlacementWorkflowTest extends TestCase
{
    use BuildsPlacementFixtures;
    use RefreshDatabase;

    private Student $strong;

    private Student $weak;

    private Student $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->strong = $this->placementStudent('strong', ['cgpa' => 8.6]);
        $this->weak = $this->placementStudent('weak', ['cgpa' => 6.8, 'backlogs' => 2]);
        $this->other = $this->placementStudent('mech', ['cgpa' => 9.0, 'department' => 'ME']);
    }

    public function test_officer_previews_rules_and_sees_who_is_eligible_with_reasons(): void
    {
        $preview = $this->as('placement@demo.com')->postJson('/api/v1/placement/eligibility/preview', [
            'eligibility' => $this->jobPayload()['eligibility'],
        ])->assertOk();

        // Demo students plus the three fixtures; each rule's exclusions are counted on their own.
        $this->assertSame(Student::query()->count(), $preview->json('data.total'));
        $this->assertGreaterThan(0, $preview->json('data.excludedByRule.0'));

        $this->as('placement@demo.com')->postJson('/api/v1/placement/eligibility/preview', [
            'eligibility' => [['field' => 'cgpa', 'operator' => 'in', 'value' => 7]],
        ])->assertUnprocessable()->assertJsonValidationErrors('eligibility.0.operator');

        $jobId = $this->as('placement@demo.com')->postJson('/api/v1/placement/jobs', $this->jobPayload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.company.name', 'Acme Systems')
            ->assertJsonPath('data.packageDisplay', '6–8 LPA')
            ->assertJsonCount(3, 'data.eligibility')
            ->json('data.id');

        $rows = collect($this->as('placement@demo.com')->getJson("/api/v1/placement/jobs/{$jobId}/eligible-students")->assertOk()->json('data'))->keyBy('id');

        $this->assertTrue($rows[$this->strong->id]['eligible']);
        $this->assertFalse($rows[$this->weak->id]['eligible']);
        $this->assertSame(['CGPA', 'Active backlogs'], collect($rows[$this->weak->id]['failedRules'])->pluck('label')->all());
        $this->assertSame('6.8', $rows[$this->weak->id]['failedRules'][0]['actual']);
        $this->assertSame('one of CSE, ECE', $rows[$this->other->id]['failedRules'][0]['expected']);
    }

    public function test_publishing_notifies_only_students_who_can_apply(): void
    {
        Notification::fake();

        $this->publishedJob();

        Notification::assertSentTo($this->strong->user, JobPublished::class);
        Notification::assertNotSentTo($this->weak->user, JobPublished::class);
        Notification::assertNotSentTo($this->other->user, JobPublished::class);
    }

    public function test_students_see_their_eligibility_and_only_eligible_students_can_apply(): void
    {
        $jobId = $this->publishedJob();

        $feed = $this->as('weak@placement.test')->getJson('/api/v1/students/me/jobs')->assertOk();
        $job = collect($feed->json('data'))->firstWhere('id', $jobId);
        $this->assertFalse($job['assessment']['canApply']);
        $this->assertSame('CGPA', collect($job['assessment']['rules'])->firstWhere('passed', false)['label']);

        $this->as('weak@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")
            ->assertUnprocessable()
            ->assertJsonPath('reasons.0', 'CGPA: needs ≥ 7.5, you have 6.8.');

        $applicationId = $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")
            ->assertCreated()
            ->assertJsonPath('data.status', 'applied')
            ->assertJsonPath('data.events.0.toStatus', 'applied')
            ->json('data.id');

        // Snapshot of the rules at apply time; applying again returns the same application.
        $this->assertCount(3, JobApplication::query()->find($applicationId)->eligibility_snapshot['rules']);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertOk()->assertJsonPath('data.id', $applicationId);

        $this->as('strong@placement.test')->postJson("/api/v1/students/me/applications/{$applicationId}/withdraw")
            ->assertOk()->assertJsonPath('data.status', 'withdrawn');
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")
            ->assertUnprocessable()->assertJsonPath('message', 'You withdrew from this job and cannot apply again.');
    }

    public function test_pipeline_from_shortlist_through_rounds_to_offer_and_placement(): void
    {
        Notification::fake();
        $jobId = $this->publishedJob();
        $secondJob = $this->publishedJob(['companyName' => 'Beta Labs', 'title' => 'Analyst', 'eligibility' => []]);

        $applicationId = $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->json('data.id');
        $otherApplication = $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$secondJob}/apply")->json('data.id');
        $mechApplication = $this->as('mech@placement.test')->postJson("/api/v1/students/me/jobs/{$secondJob}/apply")->json('data.id');

        // An offer needs Selected first; an invalid jump is refused.
        $this->as('placement@demo.com')->postJson('/api/v1/placement/applications/status', ['applicationIds' => [$applicationId], 'status' => 'selected'])
            ->assertUnprocessable();
        $this->as('placement@demo.com')->postJson('/api/v1/placement/applications/status', ['applicationIds' => [$applicationId], 'status' => 'shortlisted', 'note' => 'Strong profile'])
            ->assertOk()->assertJsonPath('data.0.status', 'shortlisted');
        Notification::assertSentTo($this->strong->user, ApplicationStatusChanged::class);

        $roundId = $this->as('placement@demo.com')->postJson("/api/v1/placement/jobs/{$jobId}/rounds", ['name' => 'Technical interview', 'type' => 'technical', 'scheduledAt' => now()->addDays(3)->toIso8601String()])
            ->assertCreated()->json('data.id');
        Notification::assertSentTo($this->strong->user, RoundScheduled::class);

        $this->as('placement@demo.com')->putJson("/api/v1/placement/rounds/{$roundId}/results", ['results' => [['applicationId' => $applicationId, 'status' => 'passed', 'score' => 82]]])
            ->assertOk()->assertJsonPath('data.results.0.status', 'passed');
        $this->assertSame('in_rounds', JobApplication::query()->find($applicationId)->status->value);

        // Results for another job's application are refused.
        $this->as('placement@demo.com')->putJson("/api/v1/placement/rounds/{$roundId}/results", ['results' => [['applicationId' => $mechApplication, 'status' => 'passed']]])
            ->assertUnprocessable();

        $this->as('placement@demo.com')->postJson('/api/v1/placement/applications/status', ['applicationIds' => [$applicationId], 'status' => 'selected'])->assertOk();
        $this->as('placement@demo.com')->postJson("/api/v1/placement/applications/{$applicationId}/offer", ['ctcLpa' => 7.5])
            ->assertOk()->assertJsonPath('data.status', 'offered')->assertJsonPath('data.offer.ctcLpa', 7.5);
        Notification::assertSentTo($this->strong->user, OfferIssued::class);

        $this->as('strong@placement.test')->postJson("/api/v1/students/me/applications/{$applicationId}/offer/accept")
            ->assertOk()->assertJsonPath('data.status', 'placed');

        // One-offer rule: the other open application is withdrawn; the legacy field follows.
        $this->assertSame('withdrawn', JobApplication::query()->find($otherApplication)->status->value);
        $this->assertSame('Acme Systems', $this->strong->fresh()->placed_company);

        $history = $this->as('strong@placement.test')->getJson('/api/v1/students/me/applications')->assertOk()->json('data');
        $placed = collect($history)->firstWhere('id', $applicationId);
        $this->assertSame(['applied', 'shortlisted', 'in_rounds', 'selected', 'offered', 'placed'], array_column($placed['events'], 'toStatus'));
        $this->assertSame('Technical interview', $placed['roundResults'][0]['round']);

        // Placed students are blocked from further jobs unless they qualify as dream offers.
        $third = $this->publishedJob(['companyName' => 'Gamma', 'title' => 'SDE', 'eligibility' => [], 'ctcMinLpa' => 20, 'ctcMaxLpa' => 24]);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$third}/apply")->assertUnprocessable();

        $this->policy(['dream_offer_enabled' => true, 'dream_offer_min_ctc' => 15]);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$third}/apply")->assertCreated();
    }

    public function test_offers_expire_after_their_respond_by_date(): void
    {
        $jobId = $this->publishedJob();
        $applicationId = $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->json('data.id');

        foreach (['shortlisted', 'selected'] as $status) {
            $this->as('placement@demo.com')->postJson('/api/v1/placement/applications/status', ['applicationIds' => [$applicationId], 'status' => $status])->assertOk();
        }
        $this->as('placement@demo.com')->postJson("/api/v1/placement/applications/{$applicationId}/offer")
            ->assertOk()->assertJsonPath('data.offer.ctcLpa', 8); // the job's CTC by default

        $this->travel(8)->days(); // policy default: 7 days to respond
        $this->artisan('placement:expire-offers')->expectsOutput('Expired 1 offers.')->assertSuccessful();

        $this->assertSame('offer_expired', JobApplication::query()->find($applicationId)->status->value);
    }

    public function test_placement_policies_block_applications(): void
    {
        $jobId = $this->publishedJob(['eligibility' => []]);
        $second = $this->publishedJob(['companyName' => 'Beta Labs', 'eligibility' => []]);

        // Opt-out.
        $this->as('strong@placement.test')->putJson('/api/v1/students/me/placement-preference', ['optedOut' => true])->assertOk()->assertJsonPath('data.optedOut', true);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'opted_out');
        $this->as('strong@placement.test')->putJson('/api/v1/students/me/placement-preference', ['optedOut' => false])->assertOk();

        // Debarment.
        $this->as('placement@demo.com')->postJson("/api/v1/placement/students/{$this->weak->id}/debar", ['until' => now()->addMonth()->toDateString(), 'reason' => 'Skipped an accepted drive'])->assertOk();
        $this->as('weak@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'debarred');
        $this->as('placement@demo.com')->deleteJson("/api/v1/placement/students/{$this->weak->id}/debar")->assertOk();
        $this->as('weak@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertCreated();

        // Active-application cap and profile minimum.
        $this->policy(['max_active_applications' => 1]);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertCreated();
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$second}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'application_limit');

        $this->policy(['max_active_applications' => null, 'min_profile_completion' => 60]);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$second}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'profile_incomplete');
    }

    public function test_closed_and_past_deadline_jobs_cannot_be_applied_to(): void
    {
        $jobId = $this->publishedJob();
        $this->as('placement@demo.com')->postJson("/api/v1/placement/jobs/{$jobId}/close")->assertOk()->assertJsonPath('data.status', 'closed');
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'job_closed');

        $late = $this->publishedJob(['companyName' => 'Late Co', 'applyDeadline' => now()->addHour()->toIso8601String()]);
        $this->travel(2)->hours();
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$late}/apply")->assertUnprocessable()->assertJsonPath('blockers.0.code', 'deadline_passed');

        // A job with applications cannot be deleted, only closed.
        $open = $this->publishedJob(['companyName' => 'Delta', 'applyDeadline' => now()->addDays(3)->toIso8601String()]);
        $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$open}/apply")->assertCreated();
        $this->as('placement@demo.com')->deleteJson("/api/v1/placement/jobs/{$open}")->assertConflict();
    }

    public function test_legacy_company_apply_uses_the_new_rules(): void
    {
        $jobId = $this->publishedJob();
        $companyId = DB::table('job_postings')->where('id', $jobId)->value('company_id');

        $this->as('weak@placement.test')->postJson("/api/v1/companies/{$companyId}/apply")->assertUnprocessable();
        $this->as('strong@placement.test')->postJson("/api/v1/companies/{$companyId}/apply")->assertOk();

        $this->assertTrue(JobApplication::query()->where('job_posting_id', $jobId)->where('student_id', $this->strong->id)->exists());
        $this->assertSame('Open', DB::table('companies')->where('id', $companyId)->value('status'));
    }

    public function test_students_cannot_manage_jobs_or_see_other_applicants(): void
    {
        $jobId = $this->publishedJob();
        $applicationId = $this->as('strong@placement.test')->postJson("/api/v1/students/me/jobs/{$jobId}/apply")->json('data.id');

        $this->as('weak@placement.test')->postJson('/api/v1/placement/jobs', $this->jobPayload())->assertForbidden();
        $this->as('weak@placement.test')->getJson("/api/v1/placement/jobs/{$jobId}/applications")->assertForbidden();
        $this->as('weak@placement.test')->getJson("/api/v1/placement/jobs/{$jobId}/eligible-students")->assertForbidden();
        $this->as('weak@placement.test')->postJson("/api/v1/students/me/applications/{$applicationId}/withdraw")->assertNotFound();
    }

    public function test_jobs_are_isolated_between_institutions(): void
    {
        $jobId = $this->publishedJob();
        $otherInstitution = Institution::query()->create(['name' => 'Other', 'code' => 'OTH', 'slug' => 'other', 'status' => 'active']);

        // A placement officer of another institution sees neither the job nor its applications.
        $officer = app(Tenant::class)->runAs($otherInstitution->id, fn () => User::query()->create([
            'name' => 'Other officer', 'email' => 'officer@other.test', 'password' => 'demo123',
            'role' => 'placement_officer', 'institution_id' => $otherInstitution->id,
        ]));

        $this->as($officer->email)->getJson("/api/v1/placement/jobs/{$jobId}")->assertNotFound();
        $this->as($officer->email)->getJson('/api/v1/placement/jobs')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_notifications_list_read_and_preferences(): void
    {
        $this->publishedJob();

        $list = $this->as('strong@placement.test')->getJson('/api/v1/notifications')->assertOk()
            ->assertJsonPath('meta.unreadCount', 1)
            ->assertJsonPath('data.0.category', 'placement')
            ->assertJsonPath('data.0.title', 'A new job you are eligible for: Graduate Engineer at Acme Systems');

        $this->as('strong@placement.test')->postJson('/api/v1/notifications/'.$list->json('data.0.id').'/read')->assertOk()->assertJsonPath('unreadCount', 0);

        // Another user cannot read it.
        $this->as('weak@placement.test')->postJson('/api/v1/notifications/'.$list->json('data.0.id').'/read')->assertNotFound();

        // With in-app placement notifications off, the next job is not stored.
        $this->as('strong@placement.test')->putJson('/api/v1/notifications/preferences', ['preferences' => [['category' => 'placement', 'inApp' => false, 'mail' => false]]])
            ->assertOk()->assertJsonPath('data.0.inApp', false);
        $this->publishedJob(['companyName' => 'Beta Labs']);
        $this->as('strong@placement.test')->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('meta.total', 1);
    }

    /** @param array<string, mixed> $attributes */
    private function policy(array $attributes): void
    {
        app(Tenant::class)->runAs(Institution::defaultId(), function () use ($attributes): void {
            $policy = PlacementPolicy::current();
            $policy->fill($attributes)->save();
        });
    }
}
