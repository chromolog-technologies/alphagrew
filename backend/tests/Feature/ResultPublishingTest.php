<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Models\StudentAcademicSummary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic Results spec §4 Stages 5–6 and §7.2: a semester is published whole, only once
 * every subject is approved; publishing locks marks, writes semester results and logs it.
 */
class ResultPublishingTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    private int $semester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures(subjects: 6);
        $this->semester = $this->ids['semesters'][1];

        // DS101–DS105 approved (30 + 45 = 75 → A, grade point 8); DS106 still a draft.
        foreach (['DS101', 'DS102', 'DS103', 'DS104', 'DS105'] as $subject) {
            $this->classMarks($subject, 30, 45, MarkStatus::Approved);
        }
        $this->classMarks('DS106', 30, 45, MarkStatus::Draft);
    }

    public function test_publishing_is_blocked_until_every_subject_is_approved(): void
    {
        $this->asUser('coordinator@ece.test')
            ->getJson("/api/v1/result-publishing/status?semesterId={$this->semester}")
            ->assertOk()
            ->assertJsonPath('data.semesterId', $this->semester)
            ->assertJsonPath('data.totalSubjects', 6)
            ->assertJsonPath('data.approvedSubjects', 5)
            ->assertJsonPath('data.canPublish', false)
            ->assertJsonPath('data.pendingSubjects.0.code', 'DS106')
            ->assertJsonPath('data.pendingSubjects.0.draft', 3);

        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])
            ->assertUnprocessable()
            ->assertJsonCount(1, 'pendingSubjects')
            ->assertJsonPath('pendingSubjects.0.code', 'DS106');
        $this->assertSame(0, DB::table('mark_entries')->where('status', 'locked')->count());

        $this->approveDs106();

        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])
            ->assertOk()
            ->assertJsonPath('data.action', 'published')
            ->assertJsonPath('data.entriesCount', 18)
            ->assertJsonPath('data.studentsCount', 3);

        $this->assertSame(18, DB::table('mark_entries')->where('status', 'locked')->whereNotNull('locked_at')->count());
        $this->assertDatabaseHas('result_publishing_logs', [
            'semester_id' => $this->semester, 'action' => 'published', 'entries_count' => 18,
            'published_by' => $this->ids['coordinator@ece.test'], 'ip_address' => '127.0.0.1', 'institution_id' => $this->institutionId,
        ]);

        $result = DB::table('semester_results')->where('student_id', $this->ids['students']['S1'])->first();
        $this->assertEquals([8.0, 24, 24, 'PASS', 1], [(float) $result->sgpa, $result->total_credits, $result->credits_earned, $result->result, $result->is_published]);

        // ResultsPublished → RecalculateAcademicSummary (sync queue in tests).
        $summary = StudentAcademicSummary::withoutGlobalScopes()->where('student_id', $this->ids['students']['S1'])->firstOrFail();
        $this->assertSame([8.0, 0, 1, StudentAcademicSummary::SOURCE_RESULTS], [$summary->cgpa, $summary->active_backlogs, $summary->semesters_published, $summary->source]);

        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Results for Semester 1 are already published.');
    }

    public function test_only_marks_publish_holders_publish(): void
    {
        $this->approveDs106();

        foreach (['faculty@dsc.test', 'hod@dsc.test'] as $email) {
            $this->asUser($email)
                ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])
                ->assertForbidden();
        }
    }

    public function test_student_sees_the_grade_card_only_once_published(): void
    {
        $this->approveDs106();
        $this->linkStudentAccountTo('S1');

        $this->asUser('student@demo.com')->getJson("/api/v1/student/results/semester/{$this->semester}")->assertNotFound();

        $this->asUser('coordinator@ece.test')->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])->assertOk();

        $this->asUser('student@demo.com')
            ->getJson("/api/v1/student/results/semester/{$this->semester}")
            ->assertOk()
            ->assertJsonPath('data.semester.name', 'Semester 1')
            ->assertJsonPath('data.semester.academicYear', '2025-2026')
            ->assertJsonPath('data.sgpa', 8)
            ->assertJsonPath('data.totalCredits', 24)
            ->assertJsonPath('data.creditsEarned', 24)
            ->assertJsonPath('data.resultStatus', 'PASS')
            ->assertJsonCount(6, 'data.subjects')
            ->assertJsonPath('data.subjects.0.code', 'DS101')
            ->assertJsonPath('data.subjects.0.credits', 4)
            ->assertJsonPath('data.subjects.0.totalMarks', 75)
            ->assertJsonPath('data.subjects.0.grade', 'A')
            ->assertJsonPath('data.subjects.0.gradePoint', 8)
            ->assertJsonPath('data.subjects.0.status', 'PASS');

        $this->asUser('student@demo.com')
            ->getJson('/api/v1/student/results/semesters')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sgpa', 8);
    }

    public function test_unlock_needs_a_reason_and_withdraws_the_results(): void
    {
        $this->approveDs106();
        $this->linkStudentAccountTo('S1');
        $this->asUser('coordinator@ece.test')->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->semester])->assertOk();

        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/unlock', ['semesterId' => $this->semester])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/unlock', ['semesterId' => $this->semester, 'reason' => 'Revaluation changed DS103 marks'])
            ->assertOk()
            ->assertJsonPath('data.action', 'unlocked')
            ->assertJsonPath('data.reason', 'Revaluation changed DS103 marks');

        $this->assertSame(18, DB::table('mark_entries')->where('status', 'approved')->whereNull('locked_at')->count());
        $this->assertSame(0, DB::table('semester_results')->where('is_published', true)->count());
        $this->asUser('student@demo.com')->getJson("/api/v1/student/results/semester/{$this->semester}")->assertNotFound();

        $this->asUser('coordinator@ece.test')
            ->getJson("/api/v1/result-publishing/logs?semesterId={$this->semester}")
            ->assertOk()
            ->assertJsonPath('data.0.action', 'unlocked')
            ->assertJsonPath('data.1.action', 'published');

        // Approved again, so it can be re-published.
        $this->asUser('coordinator@ece.test')
            ->getJson("/api/v1/result-publishing/status?semesterId={$this->semester}")
            ->assertJsonPath('data.canPublish', true);
    }

    private function approveDs106(): void
    {
        DB::table('mark_entries')->where('subject_id', $this->ids['subjects']['DS106'])->update(['status' => MarkStatus::Approved->value]);
    }

    /** Signs student@demo.com in as the given fixture student. */
    private function linkStudentAccountTo(string $student): void
    {
        $userId = DB::table('users')->where('email', 'student@demo.com')->value('id');
        DB::table('students')->where('user_id', $userId)->update(['user_id' => null]);
        DB::table('students')->where('id', $this->ids['students'][$student])->update(['user_id' => $userId]);
    }
}
