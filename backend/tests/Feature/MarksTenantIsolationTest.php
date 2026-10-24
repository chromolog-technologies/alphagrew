<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic Results spec §7.4: institution A's exam coordinator gets 404 for institution B's
 * marks, semesters and results, and never sees them in lists.
 */
class MarksTenantIsolationTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    /** @var array<string, int> */
    private array $b = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        $this->markEntry('DS101', 'S1', 30, 45, MarkStatus::Submitted);
        $this->createInstitutionBMarks();
    }

    public function test_another_institutions_marks_return_404(): void
    {
        $semester = ['semesterId' => $this->b['semester']];

        $requests = [
            ['get', "/api/v1/result-publishing/status?semesterId={$this->b['semester']}", []],
            ['post', '/api/v1/result-publishing/publish', $semester],
            ['post', '/api/v1/result-publishing/unlock', [...$semester, 'reason' => 'Trying another institution']],
            ['get', "/api/v1/mark-entries/{$this->b['entry']}", []],
            ['get', "/api/v1/mark-entries/get-students?examId={$this->b['exam']}&subjectId={$this->b['subject']}", []],
            ['post', '/api/v1/mark-entries/save-draft', ['examId' => $this->b['exam'], 'subjectId' => $this->b['subject'], 'entries' => []]],
            ['post', "/api/v1/mark-review/{$this->b['entry']}/verify", []],
            ['post', "/api/v1/mark-review/{$this->b['entry']}/approve", []],
            ['post', "/api/v1/mark-review/{$this->b['entry']}/reject", ['remarks' => 'x']],
            ['post', '/api/v1/mark-review/bulk-approve', ['subjectId' => $this->b['subject']]],
            ['get', "/api/v1/mark-review/exam-summary?examId={$this->b['exam']}&subjectId={$this->b['subject']}", []],
            ['get', "/api/v1/grade-rules/{$this->b['gradeRule']}", []],
            ['put', "/api/v1/grade-rules/{$this->b['gradeRule']}", []],
            ['delete', "/api/v1/grade-rules/{$this->b['gradeRule']}", []],
            ['get', "/api/v1/mark-schemes/{$this->b['scheme']}", []],
            ['delete', "/api/v1/mark-schemes/{$this->b['scheme']}", []],
        ];

        foreach ($requests as [$method, $uri, $data]) {
            $this->asUser('coordinator@ece.test')->json($method, $uri, $data)->assertNotFound();
        }

        $this->assertSame('submitted', $this->entryStatus($this->b['entry']));
        $this->assertDatabaseHas('grade_rules', ['id' => $this->b['gradeRule']]);

        $this->asUser('admin@demo.com')->getJson("/api/v1/students/{$this->b['student']}/academic-summary")->assertNotFound();
        $this->asUser('student@demo.com')->getJson("/api/v1/student/results/semester/{$this->b['semester']}")->assertNotFound();
    }

    public function test_lists_only_show_the_callers_institution(): void
    {
        $this->asUser('coordinator@ece.test')->getJson('/api/v1/mark-entries')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
        $this->asUser('coordinator@ece.test')->getJson('/api/v1/mark-review/get-submitted-marks')
            ->assertOk()
            ->assertJsonPath('stats.submitted', 1);
        $this->asUser('coordinator@ece.test')->getJson('/api/v1/grade-rules')
            ->assertOk()
            ->assertJsonCount(9, 'data');
        $this->asUser('coordinator@ece.test')->getJson('/api/v1/mark-schemes')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
        $this->asUser('coordinator@ece.test')->getJson('/api/v1/result-publishing/logs')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /** The same routes do answer for the caller's own records, so the 404s above are not missing routes. */
    public function test_own_records_resolve_on_the_same_routes(): void
    {
        $entry = DB::table('mark_entries')->where('institution_id', $this->institutionId)->value('id');
        $gradeRule = DB::table('grade_rules')->where('institution_id', $this->institutionId)->value('id');
        $semester = $this->ids['semesters'][1];

        foreach ([
            "/api/v1/mark-entries/{$entry}",
            "/api/v1/grade-rules/{$gradeRule}",
            "/api/v1/mark-schemes/{$this->ids['schemes']['DS101']}",
            "/api/v1/mark-review/exam-summary?examId={$this->ids['exams']['DS101']}&subjectId={$this->ids['subjects']['DS101']}",
            "/api/v1/result-publishing/status?semesterId={$semester}",
        ] as $uri) {
            $this->asUser('coordinator@ece.test')->getJson($uri)->assertOk();
        }

        $this->asUser('faculty@dsc.test')
            ->getJson("/api/v1/mark-entries/get-students?examId={$this->ids['exams']['DS101']}&subjectId={$this->ids['subjects']['DS101']}")
            ->assertOk();

        $this->asUser('placement@demo.com')
            ->getJson('/api/v1/students/'.$this->ids['students']['S1'].'/academic-summary')
            ->assertOk()
            ->assertJsonPath('data.activeBacklogs', 0);
    }

    private function createInstitutionBMarks(): void
    {
        $b = Institution::query()->create(['name' => 'Second College', 'code' => 'SECOND', 'slug' => 'second', 'status' => 'active'])->id;
        $now = now();
        $insert = fn (string $table, array $row) => DB::table($table)->insertGetId([...$row, 'institution_id' => $b, 'created_at' => $now, 'updated_at' => $now]);

        $department = $insert('departments', ['name' => 'Data Science (B)', 'code' => 'DSC', 'status' => 'active']);
        $course = $insert('courses', ['name' => 'B.Tech DS (B)', 'code' => 'BTDS', 'department_id' => $department, 'duration_years' => 4, 'total_semesters' => 8]);
        $year = $insert('academic_years', ['year' => '2025-2026', 'code' => 'AY2526', 'start_date' => '2025-06-01', 'end_date' => '2026-05-31']);
        $this->b['semester'] = $insert('semesters', ['academic_year_id' => $year, 'name' => 'Semester 1 (B)', 'semester_number' => 1, 'start_date' => '2025-06-01', 'end_date' => '2025-11-30']);
        $this->b['subject'] = $insert('subjects', ['name' => 'B subject', 'code' => 'DS101', 'course_id' => $course, 'semester_number' => 1, 'credit_hours' => 4, 'lecture_hours' => 3]);
        $this->b['scheme'] = $insert('mark_schemes', [
            'subject_id' => $this->b['subject'], 'semester_id' => $this->b['semester'], 'internal_max' => 40, 'external_max' => 60,
            'total_max' => 100, 'internal_pass' => 16, 'external_pass' => 24, 'total_pass' => 40,
        ]);
        $this->b['exam'] = $insert('exams', [
            'name' => 'B exam', 'subject_id' => $this->b['subject'], 'exam_type_id' => DB::table('exam_types')->value('id'),
            'semester_id' => $this->b['semester'], 'exam_date' => '2025-11-20', 'start_time' => '09:00', 'end_time' => '12:00', 'duration_minutes' => 180,
        ]);
        $this->b['student'] = $insert('students', [
            'name' => 'B Student', 'email' => 'b.student@second.edu', 'registration_number' => 'BIT25DSC100', 'department_code' => 'DSC',
            'year' => 'year_1', 'gender' => 'prefer_not_to_say', 'status' => 'active', 'cgpa' => 8, 'attendance' => 90, 'fee_status' => 'paid', 'skills' => '[]',
        ]);
        $this->b['entry'] = $insert('mark_entries', [
            'exam_id' => $this->b['exam'], 'subject_id' => $this->b['subject'], 'student_id' => $this->b['student'], 'mark_scheme_id' => $this->b['scheme'],
            'internal_marks' => 30, 'external_marks' => 45, 'total_marks' => 75, 'grade' => 'A', 'grade_point' => 8, 'result' => 'PASS',
            'status' => MarkStatus::Submitted->value,
        ]);
        $this->b['gradeRule'] = $insert('grade_rules', ['grade' => 'O', 'grade_point' => 10, 'is_pass' => true, 'min_score' => 90, 'max_score' => 100]);

        $bAdmin = DB::table('users')->insertGetId([
            'institution_id' => $b, 'name' => 'B admin', 'email' => 'b.admin@second.edu', 'password' => 'x', 'role' => 'institution_admin',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('result_publishing_logs')->insert([
            'institution_id' => $b, 'semester_id' => $this->b['semester'], 'published_by' => $bAdmin, 'action' => 'published',
            'entries_count' => 1, 'created_at' => $now, 'updated_at' => $now, 'published_at' => $now,
        ]);
    }
}
