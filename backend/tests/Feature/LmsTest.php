<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Materials and assignments: allocated faculty post and grade, students of the subject see and
 * submit, late and graded work rules, signed file links.
 */
class LmsTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    private int $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        Storage::fake('local');
        $this->subject = $this->ids['subjects']['DS101'];

        // S1 (DSC, year 1) gets a login; DS101 is a semester 1 subject of a DSC course.
        $user = User::query()->create(['name' => 'Student S1', 'email' => 's1@dsc.test', 'password' => 'demo123', 'role' => UserRole::Student->value, 'institution_id' => $this->institutionId]);
        $user->forceFill(['email_verified_at' => now()])->save();
        DB::table('students')->where('id', $this->ids['students']['S1'])->update(['user_id' => $user->id]);
    }

    public function test_faculty_post_students_submit_and_faculty_grade(): void
    {
        $material = $this->asUser('faculty@dsc.test')
            ->post("/api/v1/lms/subjects/{$this->subject}/materials", ['title' => 'Unit 1 notes', 'file' => UploadedFile::fake()->create('unit1.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');
        $assignment = $this->asUser('faculty@dsc.test')
            ->postJson("/api/v1/lms/subjects/{$this->subject}/assignments", ['title' => 'Problem set 1', 'dueAt' => now()->addDay()->toIso8601String(), 'maxMarks' => 10])
            ->assertCreated()
            ->json('data.id');

        $subjects = collect($this->asUser('s1@dsc.test')->getJson('/api/v1/lms/my-subjects')->assertOk()->json('data'))->keyBy('code');
        $this->assertSame(1, $subjects['DS101']['materials']);
        $this->assertSame(1, $subjects['DS101']['openAssignments']);

        // Submit, then resubmit before grading.
        $this->asUser('s1@dsc.test')->postJson("/api/v1/lms/assignments/{$assignment}/submit", ['textAnswer' => 'First try'])->assertCreated();
        $this->asUser('s1@dsc.test')->postJson("/api/v1/lms/assignments/{$assignment}/submit", ['textAnswer' => 'Better answer'])->assertOk()->assertJsonPath('data.textAnswer', 'Better answer');
        $this->asUser('s1@dsc.test')->getJson("/api/v1/lms/subjects/{$this->subject}")
            ->assertJsonPath('data.assignments.0.mySubmission.textAnswer', 'Better answer');

        $submission = $this->asUser('faculty@dsc.test')->getJson("/api/v1/lms/assignments/{$assignment}/submissions")->assertJsonCount(1, 'data')->json('data.0.id');
        $this->asUser('faculty@dsc.test')->postJson("/api/v1/lms/submissions/{$submission}/grade", ['marks' => 11])->assertJsonValidationErrors('marks');
        $this->asUser('faculty@dsc.test')->postJson("/api/v1/lms/submissions/{$submission}/grade", ['marks' => 8, 'feedback' => 'Good'])->assertOk()->assertJsonPath('data.marks', 8);

        // Graded work is final; an assignment with submissions stays.
        $this->asUser('s1@dsc.test')->postJson("/api/v1/lms/assignments/{$assignment}/submit", ['textAnswer' => 'Change'])->assertStatus(422);
        $this->asUser('faculty@dsc.test')->deleteJson("/api/v1/lms/assignments/{$assignment}")->assertStatus(409);

        // The student opens the material through a signed link.
        $url = $this->asUser('s1@dsc.test')->getJson("/api/v1/lms/files/material/{$material}/link")->assertOk()->json('data.url');
        $this->app['auth']->forgetGuards();
        $this->withoutToken()->get($url)->assertOk();
    }

    public function test_access_rules(): void
    {
        // The HOD is not allocated to DS101; a CSE student does not take it.
        $this->asUser('hod@dsc.test')->postJson("/api/v1/lms/subjects/{$this->subject}/assignments", ['title' => 'X', 'dueAt' => now()->addDay()->toIso8601String(), 'maxMarks' => 5])->assertForbidden();
        $this->asUser('student@demo.com')->getJson("/api/v1/lms/subjects/{$this->subject}")->assertForbidden();

        // Late work only when allowed.
        $closed = $this->asUser('faculty@dsc.test')
            ->postJson("/api/v1/lms/subjects/{$this->subject}/assignments", ['title' => 'Closed', 'dueAt' => now()->subHour()->toIso8601String(), 'maxMarks' => 5])
            ->json('data.id');
        $this->asUser('s1@dsc.test')->postJson("/api/v1/lms/assignments/{$closed}/submit", ['textAnswer' => 'Late'])->assertStatus(422);

        $lateOk = $this->asUser('faculty@dsc.test')
            ->postJson("/api/v1/lms/subjects/{$this->subject}/assignments", ['title' => 'Late ok', 'dueAt' => now()->subHour()->toIso8601String(), 'maxMarks' => 5, 'allowLate' => true])
            ->json('data.id');
        $this->asUser('s1@dsc.test')->postJson("/api/v1/lms/assignments/{$lateOk}/submit", ['textAnswer' => 'Late'])->assertCreated()->assertJsonPath('data.isLate', true);

        // Faculty see the subjects they teach.
        $this->asUser('faculty@dsc.test')->getJson('/api/v1/lms/teaching')->assertJsonPath('data.0.code', 'DS101');
    }
}
