<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Jobs\RecalculateAcademicSummary;
use App\Models\StudentAcademicSummary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic Results spec §5 and §7.3: CGPA, active backlogs and backlog history are derived
 * from locked marks only.
 */
class AcademicSummaryCalculationTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_cgpa_is_credit_weighted_across_published_semesters(): void
    {
        // Five 4-credit subjects per semester = 20 credits each.
        $this->buildMarksFixtures(subjects: 5, semesters: 2);

        foreach (['DS101', 'DS102', 'DS103', 'DS104', 'DS105'] as $subject) {
            $this->classMarks($subject, 30, 45, MarkStatus::Approved); // 75 → A, 8
        }
        foreach (['DS201', 'DS202', 'DS203', 'DS204', 'DS205'] as $subject) {
            $this->classMarks($subject, 35, 50, MarkStatus::Approved); // 85 → A+, 9
        }

        $this->publish(1);
        $this->assertSame(8.0, $this->summary('S1')->cgpa);

        $this->publish(2);

        $this->assertEquals([8.0, 20], $this->semesterResult('S1', 1));
        $this->assertEquals([9.0, 20], $this->semesterResult('S1', 2));

        RecalculateAcademicSummary::dispatchSync($this->institutionId, $this->ids['students']['S1']);

        $summary = $this->summary('S1');
        $this->assertSame(8.5, $summary->cgpa);
        $this->assertSame(0, $summary->active_backlogs);
        $this->assertSame(10, $summary->subjects_published);
        $this->assertSame(2, $summary->semesters_published);
    }

    public function test_a_cleared_backlog_leaves_the_history(): void
    {
        $this->buildMarksFixtures(subjects: 1, semesters: 2);

        // Semester 1: S1 fails DS101 (internal 10 < 16); the others pass.
        $this->markEntry('DS101', 'S1', 10, 45, MarkStatus::Approved);
        $this->markEntry('DS101', 'S2', 30, 45, MarkStatus::Approved);
        $this->markEntry('DS101', 'S3', 30, 45, MarkStatus::Approved);
        $this->publish(1);

        $summary = $this->summary('S1');
        $this->assertSame([1, 1], [$summary->active_backlogs, $summary->backlog_history]);
        $this->assertSame(0.0, $summary->cgpa);
        $this->assertEquals('FAIL', DB::table('semester_results')->where('student_id', $this->ids['students']['S1'])->value('result'));

        // Semester 2: a supplementary DS101 exam, which S1 passes, alongside DS201.
        $supplementary = $this->insert('exams', [
            'name' => 'DS101 supplementary', 'subject_id' => $this->ids['subjects']['DS101'], 'exam_type_id' => DB::table('exam_types')->value('id'),
            'semester_id' => $this->ids['semesters'][2], 'exam_date' => '2026-05-10', 'start_time' => '09:00', 'end_time' => '12:00', 'duration_minutes' => 180,
        ]);
        $this->markEntry('DS101', 'S1', 30, 45, MarkStatus::Approved, $supplementary);
        $this->classMarks('DS201', 30, 45, MarkStatus::Approved);
        $this->publish(2);

        $summary = $this->summary('S1');
        $this->assertSame([0, 1], [$summary->active_backlogs, $summary->backlog_history]);
        $this->assertSame(8.0, $summary->cgpa); // DS101 (retake) and DS201, both A
    }

    private function publish(int $semester): void
    {
        $this->asUser('coordinator@ece.test')
            ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->ids['semesters'][$semester]])
            ->assertOk();
    }

    private function summary(string $student): StudentAcademicSummary
    {
        return StudentAcademicSummary::withoutGlobalScopes()->where('student_id', $this->ids['students'][$student])->firstOrFail();
    }

    /** @return array{0: float, 1: int} sgpa and total credits */
    private function semesterResult(string $student, int $semester): array
    {
        $row = DB::table('semester_results')
            ->where('student_id', $this->ids['students'][$student])
            ->where('semester_id', $this->ids['semesters'][$semester])
            ->first();

        return [(float) $row->sgpa, (int) $row->total_credits];
    }
}
