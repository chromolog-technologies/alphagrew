<?php

namespace Tests\Feature;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentAcademicSummary;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Student Journey spec step 3: prior education and the academic summary derived
 * from published results (Campus Academics addendum A6).
 */
class StudentAcademicsTest extends TestCase
{
    use RefreshDatabase;

    private int $institutionId;

    private Student $student;

    /** @var array<string, int> */
    private array $ids = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->institutionId = Institution::defaultId();
        $this->student = Student::query()->where('email', 'student@demo.com')->firstOrFail();
    }

    public function test_summary_starts_from_the_hand_entered_cgpa(): void
    {
        $this->withToken($this->tokenFor('student@demo.com'))
            ->getJson('/api/v1/students/me/academics')
            ->assertOk()
            ->assertJsonPath('data.summary.source', 'manual')
            ->assertJsonPath('data.summary.cgpa', 8.7)
            ->assertJsonPath('data.summary.activeBacklogs', 0)
            ->assertJsonPath('data.education', []);
    }

    public function test_cgpa_and_backlogs_are_derived_from_published_results(): void
    {
        $this->buildTwoSemesterResults();

        $summary = app(Tenant::class)->runAs(
            $this->institutionId,
            fn () => app(RecalculateAcademicSummaryAction::class)->execute($this->student)
        );

        // (10 x 4 + 7 x 3 + 0 x 3) / 10 credits
        $this->assertSame(6.1, $summary->cgpa);
        $this->assertSame(1, $summary->active_backlogs);   // SUB3 failed, not yet cleared
        $this->assertSame(2, $summary->backlog_history);   // SUB2 (cleared on retake) and SUB3
        $this->assertSame(3, $summary->subjects_published);
        $this->assertSame(StudentAcademicSummary::SOURCE_RESULTS, $summary->source);

        // The student list shows the derived CGPA, not the hand-entered 8.7.
        $response = $this->withToken($this->tokenFor('admin@demo.com'))
            ->getJson('/api/v1/students?per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.cgpa', 6.1)
            ->assertJsonPath('data.0.cgpaSource', 'results')
            ->assertJsonPath('data.0.activeBacklogs', 1);
    }

    public function test_publishing_results_recalculates_the_summary(): void
    {
        $this->buildTwoSemesterResults(locked: false);

        $this->withToken($this->tokenFor('admin@demo.com'))
            ->postJson('/api/v1/result-publishing/publish', ['semesterId' => $this->ids['sem1']])
            ->assertOk();

        $summary = StudentAcademicSummary::withoutGlobalScopes()->where('student_id', $this->student->id)->firstOrFail();

        // Only semester 1 is published: SUB1 (A, 10 x 4) and SUB2 failed (0 x 3).
        $this->assertSame(StudentAcademicSummary::SOURCE_RESULTS, $summary->source);
        $this->assertSame(5.71, $summary->cgpa);
        $this->assertSame(1, $summary->active_backlogs);
    }

    public function test_education_records_crud_and_validation(): void
    {
        $token = $this->tokenFor('student@demo.com');
        $payload = [
            'level' => 'class_12',
            'boardOrUniversity' => 'CBSE',
            'institutionName' => 'Kendriya Vidyalaya',
            'yearOfPassing' => 2023,
            'scoreType' => 'percentage',
            'score' => 91.4,
        ];

        $id = $this->withToken($token)->postJson('/api/v1/students/me/education', $payload)
            ->assertCreated()
            ->assertJsonPath('data.verified', false)
            ->json('data.id');

        $this->withToken($token)->postJson('/api/v1/students/me/education', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('level');

        $this->withToken($token)->postJson('/api/v1/students/me/education', [...$payload, 'level' => 'ug', 'scoreType' => 'cgpa', 'score' => 12])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('score');

        $this->withToken($token)->putJson("/api/v1/students/me/education/{$id}", [...$payload, 'score' => 92])
            ->assertOk()
            ->assertJsonPath('data.score', 92);

        $this->withToken($token)->getJson('/api/v1/students/me/academics')
            ->assertOk()
            ->assertJsonCount(1, 'data.education');

        $this->withToken($token)->deleteJson("/api/v1/students/me/education/{$id}")->assertNoContent();
    }

    public function test_staff_verify_education_and_edits_clear_verification(): void
    {
        $studentToken = $this->tokenFor('student@demo.com');
        $payload = [
            'level' => 'class_10',
            'boardOrUniversity' => 'State Board',
            'institutionName' => 'GHSS',
            'yearOfPassing' => 2021,
            'scoreType' => 'percentage',
            'score' => 88,
        ];
        $id = $this->withToken($studentToken)->postJson('/api/v1/students/me/education', $payload)->json('data.id');

        $this->app['auth']->forgetGuards();
        $admin = $this->tokenFor('admin@demo.com');

        $this->withToken($admin)
            ->postJson("/api/v1/students/{$this->student->id}/education/{$id}/verify", ['verified' => true])
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $otherStudent = Student::query()->where('email', 'anjali.iyer@brightnode.edu')->value('id');
        $this->withToken($admin)
            ->postJson("/api/v1/students/{$otherStudent}/education/{$id}/verify", ['verified' => true])
            ->assertNotFound();

        $this->withToken($admin)
            ->postJson("/api/v1/students/{$this->student->id}/education/{$id}/verify", ['verified' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('remarks');

        $this->app['auth']->forgetGuards();
        $this->withToken($studentToken)
            ->putJson("/api/v1/students/me/education/{$id}", [...$payload, 'score' => 95])
            ->assertOk()
            ->assertJsonPath('data.verified', false);
    }

    public function test_staff_view_of_academics(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->getJson("/api/v1/students/{$this->student->id}/academics")
            ->assertOk()
            ->assertJsonPath('data.summary.cgpa', 8.7);
    }

    /**
     * Semester 1: SUB1 92/100 (4 credits), SUB2 35/100 FAIL (3 credits).
     * Semester 2: SUB2 retake 65/100 PASS, SUB3 30/100 FAIL (3 credits).
     */
    private function buildTwoSemesterResults(bool $locked = true): void
    {
        $now = now();
        $i = $this->institutionId;
        $insert = fn (string $table, array $row) => DB::table($table)->insertGetId([...$row, 'created_at' => $now, 'updated_at' => $now]);

        foreach ([[90, 100, 'O', 10], [80, 89.99, 'A+', 9], [70, 79.99, 'A', 8], [60, 69.99, 'B+', 7], [50, 59.99, 'B', 6], [40, 49.99, 'C', 5], [0, 39.99, 'F', 0]] as [$min, $max, $grade, $gpa]) {
            $insert('grade_rules', ['institution_id' => $i, 'min_score' => $min, 'max_score' => $max, 'grade' => $grade, 'grade_point' => $gpa, 'is_pass' => $gpa > 0]);
        }

        $year = $insert('academic_years', ['institution_id' => $i, 'year' => '2025-2026', 'code' => 'AY2526', 'start_date' => '2025-06-01', 'end_date' => '2026-05-31']);
        $this->ids['sem1'] = $insert('semesters', ['institution_id' => $i, 'academic_year_id' => $year, 'name' => 'Semester 1', 'semester_number' => 1, 'start_date' => '2025-06-01', 'end_date' => '2025-11-30']);
        $this->ids['sem2'] = $insert('semesters', ['institution_id' => $i, 'academic_year_id' => $year, 'name' => 'Semester 2', 'semester_number' => 2, 'start_date' => '2025-12-01', 'end_date' => '2026-05-31']);
        $department = DB::table('departments')->where('code', 'CSE')->value('id');
        $course = $insert('courses', ['institution_id' => $i, 'name' => 'B.Tech CSE', 'code' => 'BTCSE', 'department_id' => $department, 'duration_years' => 4, 'total_semesters' => 8]);
        $examType = $insert('exam_types', ['name' => 'End Semester', 'code' => 'ESE']);

        $subjects = [];
        foreach ([['SUB1', 4, 1], ['SUB2', 3, 1], ['SUB3', 3, 2]] as [$code, $credits, $semesterNumber]) {
            $subjects[$code] = $insert('subjects', ['institution_id' => $i, 'name' => $code, 'code' => $code, 'course_id' => $course, 'semester_number' => $semesterNumber, 'credit_hours' => $credits, 'lecture_hours' => 3]);
        }

        $entry = function (string $subject, string $semester, int $marks, string $result, string $publishedAt) use ($insert, $i, $subjects, $examType, $locked): void {
            $semesterId = $this->ids[$semester];
            $scheme = DB::table('mark_schemes')->where('subject_id', $subjects[$subject])->where('semester_id', $semesterId)->value('id')
                ?? $insert('mark_schemes', ['institution_id' => $i, 'subject_id' => $subjects[$subject], 'semester_id' => $semesterId, 'internal_max' => 40, 'external_max' => 60, 'total_max' => 100, 'internal_pass' => 0, 'external_pass' => 0, 'total_pass' => 40]);
            $exam = $insert('exams', ['institution_id' => $i, 'name' => "{$subject} {$semester}", 'subject_id' => $subjects[$subject], 'exam_type_id' => $examType, 'semester_id' => $semesterId, 'exam_date' => $publishedAt, 'start_time' => '09:00', 'end_time' => '12:00', 'duration_minutes' => 180]);
            $insert('mark_entries', [
                'institution_id' => $i, 'exam_id' => $exam, 'student_id' => $this->student->id, 'subject_id' => $subjects[$subject],
                'mark_scheme_id' => $scheme, 'internal_marks' => 0, 'external_marks' => $marks, 'total_marks' => $marks,
                'result' => $result, 'status' => $locked ? 'locked' : 'approved', 'published_at' => $locked ? $publishedAt : null,
            ]);
        };

        $entry('SUB1', 'sem1', 92, 'PASS', '2025-12-01');
        $entry('SUB2', 'sem1', 35, 'FAIL', '2025-12-01');

        if ($locked) {
            $entry('SUB2', 'sem2', 65, 'PASS', '2026-06-01');
            $entry('SUB3', 'sem2', 30, 'FAIL', '2026-06-01');
        }
    }

    private function tokenFor(string $email): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');
    }
}
