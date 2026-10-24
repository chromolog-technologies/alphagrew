<?php

namespace Tests\Feature\Concerns;

use App\Enums\MarkStatus;
use App\Enums\UserRole;
use App\Models\Designation;
use App\Models\GradeRule;
use App\Models\Institution;
use App\Models\SubjectAllocation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

/**
 * A small marks world in the demo institution: a "DSC" department with three first-year
 * students, a semester with subjects (4 credits, 40/60 scheme, 16/24/40 pass marks),
 * one exam per subject, and these accounts (password demo123):
 *
 * - faculty@dsc.test   staff, DSC, no designation, allocated to every subject
 * - hod@dsc.test       staff, DSC, Head of Department (marks.approve)
 * - hod@cse.test       staff, CSE, Head of Department (marks.approve)
 * - coordinator@ece.test staff, ECE, Exam Coordinator (marks.approve + marks.publish)
 */
trait BuildsMarksFixtures
{
    protected int $institutionId;

    /** @var array<string, mixed> */
    protected array $ids = [];

    /** @var array<string, string> */
    private array $tokens = [];

    protected function buildMarksFixtures(int $subjects = 1, int $semesters = 1): void
    {
        $this->institutionId = Institution::defaultId();

        app(Tenant::class)->runAs($this->institutionId, function (): void {
            foreach (GradeRule::defaults() as $rule) {
                GradeRule::query()->create($rule);
            }

            $hod = Designation::query()->create(['name' => 'Head of Department', 'slug' => 'hod-test', 'status' => 'active', 'permissions' => [
                CampusPermission::MARKS_VIEW, CampusPermission::MARKS_CREATE, CampusPermission::MARKS_APPROVE,
            ]]);
            $coordinator = Designation::query()->create(['name' => 'Exam Coordinator', 'slug' => 'exam-coordinator-test', 'status' => 'active', 'permissions' => [
                CampusPermission::MARKS_VIEW, CampusPermission::MARKS_CREATE, CampusPermission::MARKS_APPROVE, CampusPermission::MARKS_PUBLISH,
            ]]);

            foreach ([
                'faculty@dsc.test' => ['DSC', null],
                'hod@dsc.test' => ['DSC', $hod->id],
                'hod@cse.test' => ['CSE', $hod->id],
                'coordinator@ece.test' => ['ECE', $coordinator->id],
            ] as $email => [$department, $designationId]) {
                $this->ids[$email] = User::query()->create([
                    'name' => $email, 'email' => $email, 'password' => 'demo123', 'role' => UserRole::Staff->value,
                    'institution_id' => $this->institutionId, 'title' => 'Faculty', 'department_code' => $department,
                    'designation_id' => $designationId,
                ])->id;
            }
        });

        $department = $this->insert('departments', ['name' => 'Data Science', 'code' => 'DSC', 'status' => 'active']);
        $course = $this->insert('courses', ['name' => 'B.Tech DS', 'code' => 'BTDS', 'department_id' => $department, 'duration_years' => 4, 'total_semesters' => 8]);
        $year = $this->insert('academic_years', ['year' => '2025-2026', 'code' => 'AY2526', 'start_date' => '2025-06-01', 'end_date' => '2026-05-31']);
        $examType = $this->insert('exam_types', ['name' => 'End Semester', 'code' => 'ESE'], tenant: false);

        foreach (['S1', 'S2', 'S3'] as $n => $key) {
            $this->ids['students'][$key] = $this->insert('students', [
                'name' => "Student {$key}", 'email' => strtolower($key).'@dsc.test', 'registration_number' => "BIT25DSC00{$n}",
                'department_code' => 'DSC', 'year' => 'year_1', 'gender' => 'prefer_not_to_say', 'status' => 'active',
                'cgpa' => 0, 'attendance' => 0, 'fee_status' => 'paid', 'skills' => '[]',
            ]);
        }

        for ($s = 1; $s <= $semesters; $s++) {
            $semester = $this->ids['semesters'][$s] = $this->insert('semesters', [
                'academic_year_id' => $year, 'name' => "Semester {$s}", 'semester_number' => $s,
                'start_date' => '2025-06-01', 'end_date' => '2026-05-31',
            ]);

            for ($n = 1; $n <= $subjects; $n++) {
                $code = "DS{$s}0{$n}";
                $subject = $this->ids['subjects'][$code] = $this->insert('subjects', [
                    'name' => "Subject {$code}", 'code' => $code, 'course_id' => $course, 'semester_number' => $s,
                    'credit_hours' => 4, 'lecture_hours' => 3,
                ]);
                $this->ids['schemes'][$code] = $this->insert('mark_schemes', [
                    'subject_id' => $subject, 'semester_id' => $semester, 'internal_max' => 40, 'external_max' => 60, 'total_max' => 100,
                    'internal_pass' => 16, 'external_pass' => 24, 'total_pass' => 40,
                ]);
                $this->ids['exams'][$code] = $this->insert('exams', [
                    'name' => "{$code} end semester", 'subject_id' => $subject, 'exam_type_id' => $examType, 'semester_id' => $semester,
                    'exam_date' => '2025-11-20', 'start_time' => '09:00', 'end_time' => '12:00', 'duration_minutes' => 180,
                ]);

                app(Tenant::class)->runAs($this->institutionId, fn () => SubjectAllocation::query()->create([
                    'subject_id' => $subject, 'faculty_id' => $this->ids['faculty@dsc.test'], 'semester_id' => $semester,
                    'allocated_from' => '2025-06-01',
                ]));
            }
        }
    }

    /**
     * Writes a mark entry straight to the database at any stage (bypassing the API), graded
     * from the default scale: total = internal + external.
     */
    protected function markEntry(string $subject, string $student, float $internal, float $external, MarkStatus $status, ?int $exam = null): int
    {
        $total = $internal + $external;
        [$grade, $point, $pass] = match (true) {
            $internal < 16 || $external < 24 => ['F', 0, false],
            $total >= 90 => ['O', 10, true],
            $total >= 80 => ['A+', 9, true],
            $total >= 70 => ['A', 8, true],
            $total >= 60 => ['B+', 7, true],
            default => ['P', 4, true],
        };
        $locked = $status === MarkStatus::Locked ? now() : null;

        return $this->insert('mark_entries', [
            'exam_id' => $exam ?? $this->ids['exams'][$subject], 'subject_id' => $this->ids['subjects'][$subject],
            'student_id' => $this->ids['students'][$student], 'mark_scheme_id' => $this->ids['schemes'][$subject],
            'internal_marks' => $internal, 'external_marks' => $external, 'extra_marks' => 0, 'total_marks' => $total,
            'grade' => $grade, 'grade_point' => $point, 'result' => $pass ? 'PASS' : 'FAIL', 'status' => $status->value,
            'entered_by' => $this->ids['faculty@dsc.test'], 'locked_at' => $locked, 'published_at' => $locked,
        ]);
    }

    /** Every student gets the same marks for the subject. */
    protected function classMarks(string $subject, float $internal, float $external, MarkStatus $status): void
    {
        foreach (array_keys($this->ids['students']) as $student) {
            $this->markEntry($subject, $student, $internal, $external, $status);
        }
    }

    /** Draft payload for the whole class, as the faculty would send it. */
    protected function draftPayload(string $subject, float $internal = 30, float $external = 45): array
    {
        return [
            'examId' => $this->ids['exams'][$subject],
            'subjectId' => $this->ids['subjects'][$subject],
            'entries' => array_map(fn (int $id) => [
                'studentId' => $id, 'internalMarks' => $internal, 'externalMarks' => $external, 'extraMarks' => 0, 'isAbsent' => false,
            ], array_values($this->ids['students'])),
        ];
    }

    /** Requests as the given user (password demo123). */
    protected function asUser(string $email): static
    {
        $this->app['auth']->forgetGuards();

        $this->tokens[$email] ??= (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');

        return $this->withToken($this->tokens[$email]);
    }

    protected function entryStatus(int $id): string
    {
        return DB::table('mark_entries')->where('id', $id)->value('status');
    }

    protected function assertMessage(TestResponse $response, string $fragment): void
    {
        $this->assertStringContainsString($fragment, (string) $response->json('message'));
    }

    protected function insert(string $table, array $row, bool $tenant = true): int
    {
        $now = now();

        return DB::table($table)->insertGetId([
            ...$row,
            ...($tenant ? ['institution_id' => $this->institutionId] : []),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
