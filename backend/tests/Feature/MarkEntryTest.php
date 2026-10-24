<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic Results spec §4 Stages 1–3: grade rules, mark schemes, faculty draft entry
 * with automatic grading, and submission for review.
 */
class MarkEntryTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_grade_rules_and_schemes_are_validated(): void
    {
        $this->asUser('admin@demo.com')->getJson('/api/v1/grade-rules')
            ->assertOk()
            ->assertJsonCount(9, 'data')
            ->assertJsonPath('data.0.grade', 'O')
            ->assertJsonPath('data.0.gradePoint', 10);

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/grade-rules', ['grade' => 'E', 'gradePoint' => 3, 'minScore' => 35, 'maxScore' => 45, 'isPass' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('minScore');

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/mark-schemes', [
                'subjectId' => $this->ids['subjects']['DS101'], 'semesterId' => $this->ids['semesters'][1],
                'internalMax' => 40, 'externalMax' => 60, 'totalMax' => 100, 'internalPass' => 16, 'externalPass' => 24, 'totalPass' => 40,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('subjectId'); // already has a scheme this semester

        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/mark-schemes/{$this->ids['schemes']['DS101']}", [
                'subjectId' => $this->ids['subjects']['DS101'], 'semesterId' => $this->ids['semesters'][1],
                'internalMax' => 30, 'externalMax' => 70, 'totalMax' => 90, 'internalPass' => 12, 'externalPass' => 28, 'totalPass' => 40,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('totalMax');
    }

    public function test_faculty_saves_drafts_and_marks_are_graded(): void
    {
        $payload = $this->draftPayload('DS101');
        $payload['entries'][0] = [...$payload['entries'][0], 'internalMarks' => 34.5, 'externalMarks' => 48, 'extraMarks' => 2, 'remarks' => 'Active lab participation'];
        $payload['entries'][1] = [...$payload['entries'][1], 'internalMarks' => 12, 'externalMarks' => 60];       // internal below 16
        $payload['entries'][2] = [...$payload['entries'][2], 'internalMarks' => 12, 'externalMarks' => 0, 'isAbsent' => true];

        $entries = $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/save-draft', $payload)
            ->assertOk()
            ->assertJsonPath('data.savedCount', 3)
            ->json('data.entries');

        $this->assertSame([84.5, 'A+', 9, 'PASS'], [$entries[0]['totalMarks'], $entries[0]['grade'], $entries[0]['gradePoint'], $entries[0]['result']]);
        $this->assertSame(['F', 0, 'FAIL'], [$entries[1]['grade'], $entries[1]['gradePoint'], $entries[1]['result']]);
        $this->assertSame(['Ab', 0, 'FAIL'], [$entries[2]['grade'], $entries[2]['gradePoint'], $entries[2]['result']]);

        $this->asUser('faculty@dsc.test')
            ->getJson("/api/v1/mark-entries/get-students?examId={$payload['examId']}&subjectId={$payload['subjectId']}")
            ->assertOk()
            ->assertJsonCount(3, 'data.students')
            ->assertJsonPath('data.markScheme.internalMax', 40)
            ->assertJsonPath('data.students.0.entry.status', 'draft');
    }

    public function test_marks_above_the_scheme_maximum_are_rejected(): void
    {
        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/save-draft', $this->draftPayload('DS101', internal: 41))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('entries.0.internalMarks');
    }

    public function test_only_allocated_faculty_enter_marks(): void
    {
        $response = $this->asUser('hod@cse.test')
            ->postJson('/api/v1/mark-entries/save-draft', $this->draftPayload('DS101'))
            ->assertForbidden();

        $this->assertMessage($response, 'not allocated to DS101');
    }

    public function test_submission_needs_every_student_and_freezes_the_marks(): void
    {
        $payload = $this->draftPayload('DS101');
        $submit = ['examId' => $payload['examId'], 'subjectId' => $payload['subjectId'], 'declarationConfirmed' => true];
        array_pop($payload['entries']);

        $this->asUser('faculty@dsc.test')->postJson('/api/v1/mark-entries/save-draft', $payload)->assertOk();

        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/submit', [...$submit, 'declarationConfirmed' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('declarationConfirmed');

        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/submit', $submit)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Incomplete marks entry for 1 students')
            ->assertJsonPath('missingStudents.0.id', $this->ids['students']['S3']);

        $this->asUser('faculty@dsc.test')->postJson('/api/v1/mark-entries/save-draft', $this->draftPayload('DS101'))->assertOk();
        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/submit', $submit)
            ->assertOk()
            ->assertJsonPath('data.submittedCount', 3);

        $this->assertSame(3, DB::table('mark_entries')->where('status', MarkStatus::Submitted->value)->whereNotNull('submitted_at')->count());

        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-entries/save-draft', $this->draftPayload('DS101', external: 50))
            ->assertUnprocessable();
        $this->assertSame(0, DB::table('mark_entries')->where('external_marks', 50)->count());
    }
}
