<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Recruiter portal: accounts created by the placement office, sign-in, the company's jobs,
 * only shortlisted candidates, feedback on the application history, and isolation.
 */
class RecruiterPortalTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    private int $company;

    private int $otherCompany;

    private int $job;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        Notification::fake();

        $this->company = $this->insert('companies', ['name' => 'Acme', 'role' => 'Engineer', 'package_offered' => '8 LPA', 'drive_date' => '2026-12-01', 'location' => 'Kochi', 'eligible_departments' => '["DSC"]']);
        $this->otherCompany = $this->insert('companies', ['name' => 'Globex', 'role' => 'Analyst', 'package_offered' => '6 LPA', 'drive_date' => '2026-12-01', 'location' => 'Pune', 'eligible_departments' => '["DSC"]']);
        $drive = DB::table('placement_drives')->insertGetId(['institution_id' => $this->institutionId, 'company_id' => $this->company, 'title' => 'Acme 2026', 'starts_on' => '2026-12-01', 'status' => 'open', 'created_at' => now(), 'updated_at' => now()]);
        $this->job = $this->insert('job_postings', ['drive_id' => $drive, 'company_id' => $this->company, 'title' => 'Data Engineer', 'status' => 'published']);

        foreach (['S1' => 'shortlisted', 'S2' => 'applied', 'S3' => 'in_rounds'] as $student => $status) {
            $this->insert('job_applications', ['job_posting_id' => $this->job, 'student_id' => $this->ids['students'][$student], 'status' => $status, 'applied_at' => now()]);
        }
    }

    public function test_placement_office_invites_a_recruiter_who_signs_in(): void
    {
        $this->asUser('faculty@dsc.test')->postJson("/api/v1/companies/{$this->company}/recruiters", ['name' => 'Priya', 'email' => 'priya@acme.test'])->assertForbidden();

        $this->asUser('admin@demo.com')->postJson("/api/v1/companies/{$this->company}/recruiters", ['name' => 'Priya', 'email' => 'priya@acme.test'])
            ->assertCreated()
            ->assertJsonPath('data.emailSent', true);
        $recruiter = User::query()->withoutGlobalScopes()->where('email', 'priya@acme.test')->firstOrFail();
        Notification::assertSentTo($recruiter, VerifyAccountNotification::class);
        $this->assertSame($this->company, (int) $recruiter->company_id);
        $this->assertSame($this->institutionId, (int) $recruiter->institution_id);

        $recruiter->forceFill(['password' => 'demo123'])->save();
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'priya@acme.test', 'password' => 'demo123', 'portal' => 'campus'])->assertOk()->json('token');
        // The app loads its dataset right after sign-in; a recruiter gets no students in it.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/campus/bootstrap')->assertOk()->assertJsonCount(0, 'data.students');
        $this->asUser('admin@demo.com')->getJson("/api/v1/companies/{$this->company}/recruiters")->assertJsonCount(1, 'data');
    }

    public function test_recruiters_see_only_shortlisted_candidates_of_their_company(): void
    {
        $this->recruiter('priya@acme.test', $this->company);
        $this->recruiter('omar@globex.test', $this->otherCompany);

        $this->asUser('priya@acme.test')->getJson('/api/v1/recruiter/jobs')
            ->assertOk()
            ->assertJsonPath('meta.company.name', 'Acme')
            ->assertJsonPath('data.0.sharedCandidates', 2);

        $candidates = $this->asUser('priya@acme.test')->getJson("/api/v1/recruiter/jobs/{$this->job}/candidates")->assertOk()->json('data');
        $this->assertEqualsCanonicalizing(['Student S1', 'Student S3'], array_column(array_column($candidates, 'student'), 'name'), 'The "applied" candidate is not shared.');

        // Another company's recruiter sees nothing of this job; recruiters see no student list.
        $this->asUser('omar@globex.test')->getJson("/api/v1/recruiter/jobs/{$this->job}/candidates")->assertNotFound();
        $this->asUser('priya@acme.test')->getJson('/api/v1/students')->assertForbidden();
    }

    public function test_feedback_is_recorded_without_changing_the_status(): void
    {
        $this->recruiter('priya@acme.test', $this->company);
        $shortlisted = DB::table('job_applications')->where('student_id', $this->ids['students']['S1'])->value('id');
        $applied = DB::table('job_applications')->where('student_id', $this->ids['students']['S2'])->value('id');

        $this->asUser('priya@acme.test')->postJson("/api/v1/recruiter/applications/{$shortlisted}/feedback", ['decision' => 'recommend', 'note' => 'Strong SQL'])
            ->assertCreated()
            ->assertJsonPath('data.note', 'Recruiter feedback (priya@acme.test): recommend. Strong SQL');
        $this->assertSame('shortlisted', DB::table('job_applications')->where('id', $shortlisted)->value('status'));
        $this->asUser('priya@acme.test')->postJson("/api/v1/recruiter/applications/{$applied}/feedback", ['decision' => 'reject'])->assertNotFound();

        $this->asUser('priya@acme.test')->getJson("/api/v1/recruiter/jobs/{$this->job}/candidates")
            ->assertJsonFragment(['note' => 'Recruiter feedback (priya@acme.test): recommend. Strong SQL']);

        // Removing access signs the recruiter out.
        $id = User::query()->withoutGlobalScopes()->where('email', 'priya@acme.test')->value('id');
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/companies/{$this->company}/recruiters/{$id}")->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => 'priya@acme.test', 'password' => 'demo123'])->assertForbidden();
    }

    private function recruiter(string $email, int $company): void
    {
        $user = User::query()->create(['name' => $email, 'email' => $email, 'password' => 'demo123', 'role' => 'recruiter', 'institution_id' => $this->institutionId, 'status' => 'active']);
        $user->forceFill(['company_id' => $company, 'email_verified_at' => now()])->save();
    }
}
