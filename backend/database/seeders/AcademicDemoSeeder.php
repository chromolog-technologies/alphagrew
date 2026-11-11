<?php

namespace Database\Seeders;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\Actions\Marks\PublishSemesterResultsAction;
use App\Enums\MarkStatus;
use App\Enums\UserRole;
use App\Events\StudentResultsChanged;
use App\Models\Designation;
use App\Models\GradeRule;
use App\Models\Institution;
use App\Models\MarkEntry;
use App\Models\MarkScheme;
use App\Models\Semester;
use App\Models\Student;
use App\Models\SubjectAllocation;
use App\Models\User;
use App\Services\Academics\MarkGrader;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

/**
 * Academic records for the demo institution, so the role dashboards, marks review and
 * results screens have real data to read. Runs after CampusDemoSeeder (it needs its
 * students and departments) and is deterministic: every run produces the same data.
 *
 * - Designations "Faculty", "Head of Department" and "Exam Coordinator", and the accounts
 *   hod.cse@demo.com (CSE), exam@demo.com and one faculty member each for ECE, ME and MBA
 *   (password demo123). staff@demo.com becomes CSE faculty.
 * - A course per department with six subjects, taught over three terms: two published
 *   terms in 2025-26 and the current term (Jul to Nov 2026).
 * - Past terms: end-semester exams, graded marks, published through the real publishing
 *   action, so SGPA, CGPA and backlogs are calculated exactly as in production.
 * - Current term: subject allocations, about 35 attendance sessions per subject, a
 *   conducted mid-term with marks at every review stage, and upcoming end-semester exams.
 */
class AcademicDemoSeeder extends Seeder
{
    private const PASSWORD = 'demo123';

    /** Department code => [course name, course code, years, six subjects as [code, name, credits]]. */
    private const CURRICULUM = [
        'CSE' => ['B.Tech Computer Science and Engineering', 'BTCSE', 4, [
            ['CSE101', 'Programming in C', 4], ['CSE102', 'Engineering Mathematics', 3],
            ['CSE201', 'Data Structures', 4], ['CSE202', 'Digital Logic Design', 3],
            ['CSE301', 'Database Management Systems', 4], ['CSE302', 'Operating Systems', 3],
        ]],
        'ECE' => ['B.Tech Electronics and Communication', 'BTECE', 4, [
            ['ECE101', 'Basic Electronics', 4], ['ECE102', 'Circuit Theory', 3],
            ['ECE201', 'Signals and Systems', 4], ['ECE202', 'Electronic Devices', 3],
            ['ECE301', 'Analog Communication', 4], ['ECE302', 'Microprocessors', 3],
        ]],
        'ME' => ['B.Tech Mechanical Engineering', 'BTME', 4, [
            ['ME101', 'Engineering Mechanics', 4], ['ME102', 'Engineering Drawing', 3],
            ['ME201', 'Thermodynamics', 4], ['ME202', 'Manufacturing Processes', 3],
            ['ME301', 'Fluid Mechanics', 4], ['ME302', 'Machine Design', 3],
        ]],
        'MBA' => ['Master of Business Administration', 'MBA', 2, [
            ['MBA101', 'Principles of Management', 4], ['MBA102', 'Managerial Economics', 3],
            ['MBA201', 'Financial Accounting', 4], ['MBA202', 'Marketing Management', 3],
            ['MBA301', 'Business Analytics', 4], ['MBA302', 'Operations Management', 3],
        ]],
    ];

    /** Terms in date order; the last one is in progress. */
    private const TERMS = [
        ['AY2526', '2025-2026', 'Odd Semester 2025-26', 1, '2025-07-01', '2025-11-30', '2025-11-17'],
        ['AY2526', '2025-2026', 'Even Semester 2025-26', 2, '2025-12-15', '2026-04-30', '2026-04-20'],
        ['AY2627', '2026-2027', 'Odd Semester 2026-27', 1, '2026-07-01', '2026-11-30', '2026-11-23'],
    ];

    /** Current-term mid-term marks: where each subject is in the review pipeline (null = not entered yet). */
    private const CURRENT_STAGES = [
        'CSE301' => MarkStatus::Approved, 'CSE302' => MarkStatus::Submitted,
        'ECE301' => MarkStatus::Approved, 'ECE302' => MarkStatus::Verified,
        'ME301' => MarkStatus::Submitted, 'ME302' => MarkStatus::Draft,
        'MBA301' => MarkStatus::Draft, 'MBA302' => null,
    ];

    private int $institutionId;

    /** @var array<string, int> department code => faculty user id */
    private array $faculty = [];

    /** @var IlluminateSupportCollection<string, IlluminateSupportCollection<int, Student>>|null */
    private $studentsByDepartment = null;

    private int $hodId;

    private int $coordinatorId;

    /** @var array<int, int> term index => semester id */
    private array $semesters = [];

    /** @var array<string, array{id: int, department: string, term: int, credits: int}> subject code => subject */
    private array $subjects = [];

    /** Removes everything this seeder creates, children first. Safe on an empty database. */
    public static function clear(): void
    {
        foreach ([
            'revaluation_requests', 'result_publishing_logs', 'student_academic_summaries', 'semester_results',
            'mark_entries', 'attendance', 'subject_allocations', 'exams', 'mark_schemes', 'subjects',
            'courses', 'semesters', 'academic_years', 'grade_rules',
        ] as $table) {
            DB::table($table)->delete();
        }
    }

    public function run(): void
    {
        $this->institutionId = Institution::query()->where('code', Institution::DEFAULT_CODE)->value('id')
            ?? throw new \RuntimeException('Run CampusDemoSeeder first: the demo institution does not exist.');

        DB::transaction(fn () => app(Tenant::class)->runAs($this->institutionId, function (): void {
            self::clear();

            $this->staff();
            $this->structure();
            $this->pastTerms();
            $this->currentTerm();
            $this->summaries();
        }));
    }

    /** Designations and the HOD, exam coordinator and per-department faculty accounts. */
    private function staff(): void
    {
        $designation = fn (string $name, string $slug, string $description, array $permissions) => Designation::query()->updateOrCreate(
            ['slug' => $slug],
            ['name' => $name, 'description' => $description, 'status' => 'active', 'permissions' => $permissions],
        )->id;

        $facultyRole = $designation('Faculty', 'faculty', 'Teaches allocated subjects, records attendance and enters marks.', [
            CampusPermission::STUDENTS_VIEW, CampusPermission::MARKS_VIEW, CampusPermission::MARKS_CREATE,
        ]);
        $hodRole = $designation('Head of Department', 'hod', 'Reviews and approves the department\'s marks.', [
            CampusPermission::STUDENTS_VIEW, CampusPermission::MARKS_VIEW, CampusPermission::MARKS_CREATE,
            CampusPermission::MARKS_APPROVE, CampusPermission::REPORTS_VIEW,
        ]);
        $coordinatorRole = $designation('Exam Coordinator', 'exam-coordinator', 'Schedules exams and publishes results for the institution.', [
            CampusPermission::STUDENTS_VIEW, CampusPermission::MARKS_VIEW, CampusPermission::MARKS_CREATE,
            CampusPermission::MARKS_APPROVE, CampusPermission::MARKS_PUBLISH, CampusPermission::REPORTS_VIEW,
        ]);

        // The UserObserver syncs each account's permissions from its role and designation.
        $account = fn (string $email, string $name, string $title, ?string $department, int $designationId) => User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name, 'password' => self::PASSWORD, 'role' => UserRole::Staff->value,
                'institution_id' => $this->institutionId, 'title' => $title, 'department_code' => $department,
                'designation_id' => $designationId, 'email_verified_at' => now(),
            ],
        )->id;

        $this->faculty = [
            'CSE' => $account('staff@demo.com', 'Meera Nair', 'Assistant Professor', 'CSE', $facultyRole),
            'ECE' => $account('ece.faculty@demo.com', 'Arjun Nair', 'Assistant Professor', 'ECE', $facultyRole),
            'ME' => $account('me.faculty@demo.com', 'Kavitha Rao', 'Associate Professor', 'ME', $facultyRole),
            'MBA' => $account('mba.faculty@demo.com', 'Sandeep Iyer', 'Assistant Professor', 'MBA', $facultyRole),
        ];
        $this->hodId = $account('hod.cse@demo.com', 'Dr. Meera Thomas', 'Head of Department, CSE', 'CSE', $hodRole);
        $this->coordinatorId = $account('exam@demo.com', 'Dr. Suresh Pillai', 'Controller of Examinations', null, $coordinatorRole);
    }

    /** Grade rules, exam types, academic years, terms, courses, subjects, schemes and allocations. */
    private function structure(): void
    {
        foreach (GradeRule::defaults() as $index => $rule) {
            GradeRule::query()->create([...$rule, 'sort_order' => $index]);
        }

        // Exam types are shared across institutions.
        $examTypes = [];
        foreach ([['ESE', 'End Semester', 100, 40, 60], ['MID', 'Mid Term', 100, 40, 40]] as [$code, $name, $max, $pass, $weight]) {
            DB::table('exam_types')->updateOrInsert(
                ['code' => $code],
                ['name' => $name, 'max_marks' => $max, 'passing_marks' => $pass, 'weightage' => $weight, 'deleted_at' => null, 'updated_at' => now(), 'created_at' => now()],
            );
            $examTypes[$code] = (int) DB::table('exam_types')->where('code', $code)->value('id');
        }

        $years = [];
        foreach (self::TERMS as $index => [$yearCode, $year, $name, $number, $start, $end]) {
            $years[$yearCode] ??= $this->insert('academic_years', [
                'year' => $year, 'code' => $yearCode, 'start_date' => substr($year, 0, 4).'-06-01',
                'end_date' => substr($year, 5, 4).'-05-31', 'is_active' => $yearCode === 'AY2627',
            ]);
            $this->semesters[$index] = $this->insert('semesters', [
                'academic_year_id' => $years[$yearCode], 'name' => $name, 'semester_number' => $number,
                'start_date' => $start, 'end_date' => $end, 'is_active' => $index === array_key_last(self::TERMS),
            ]);
        }

        $departments = DB::table('departments')->where('institution_id', $this->institutionId)->pluck('id', 'code');

        foreach (self::CURRICULUM as $department => [$courseName, $courseCode, $years, $subjects]) {
            $courseId = $this->insert('courses', [
                'name' => $courseName, 'code' => $courseCode, 'department_id' => $departments[$department]
                    ?? throw new \RuntimeException("Department {$department} is missing; run CampusDemoSeeder first."),
                'duration_years' => $years, 'total_semesters' => $years * 2, 'is_active' => true,
            ]);

            foreach ($subjects as $position => [$code, $name, $credits]) {
                $term = intdiv($position, 2);
                $subjectId = $this->insert('subjects', [
                    'name' => $name, 'code' => $code, 'course_id' => $courseId, 'semester_number' => $term + 1,
                    'credit_hours' => $credits, 'lecture_hours' => $credits, 'practical_hours' => 0,
                    'subject_type' => 'theory', 'is_mandatory' => true, 'is_active' => true,
                ]);
                $this->subjects[$code] = ['id' => $subjectId, 'department' => $department, 'term' => $term, 'credits' => $credits];

                $this->insert('mark_schemes', [
                    'subject_id' => $subjectId, 'semester_id' => $this->semesters[$term],
                    'internal_max' => 40, 'external_max' => 60, 'total_max' => 100,
                    'internal_pass' => 16, 'external_pass' => 24, 'total_pass' => 40, 'is_active' => true,
                ]);

                [, , , , $start, $end, $examDay] = self::TERMS[$term];
                $isCurrent = $term === array_key_last(self::TERMS);
                $examDate = Carbon::parse($examDay)->addDays($position % 2 * 2);

                $this->insert('exams', [
                    'name' => "{$name} - End Semester", 'subject_id' => $subjectId, 'exam_type_id' => $examTypes['ESE'],
                    'semester_id' => $this->semesters[$term], 'exam_date' => $examDate->toDateString().' 09:30:00',
                    'start_time' => '09:30', 'end_time' => '12:30', 'duration_minutes' => 180, 'max_marks' => 100,
                    'location' => "Exam Hall {$department}", 'exam_mode' => 'offline',
                    'status' => $isCurrent ? ($code === 'MBA302' ? 'postponed' : 'scheduled') : 'conducted',
                ]);

                if ($isCurrent) {
                    $this->insert('exams', [
                        'name' => "{$name} - Mid Term", 'subject_id' => $subjectId, 'exam_type_id' => $examTypes['MID'],
                        'semester_id' => $this->semesters[$term], 'exam_date' => Carbon::parse('2026-09-14')->addDays($position % 2)->toDateString().' 10:00:00',
                        'start_time' => '10:00', 'end_time' => '11:30', 'duration_minutes' => 90, 'max_marks' => 100,
                        'location' => "Room {$department}-1", 'exam_mode' => 'offline', 'status' => 'conducted',
                    ]);
                }

                SubjectAllocation::query()->create([
                    'subject_id' => $subjectId, 'faculty_id' => $this->faculty[$department], 'semester_id' => $this->semesters[$term],
                    'allocated_from' => $start, 'allocated_to' => $isCurrent ? null : $end,
                ]);
            }
        }
    }

    /** End-semester marks for both 2025-26 terms, approved and then published as the exam coordinator. */
    private function pastTerms(): void
    {
        $coordinator = User::query()->findOrFail($this->coordinatorId);
        $publish = app(PublishSemesterResultsAction::class);

        foreach (array_slice(array_keys(self::TERMS), 0, -1) as $term) {
            foreach ($this->subjectsInTerm($term) as $code => $subject) {
                $this->markClass($code, $subject, 'ESE', MarkStatus::Approved);
            }

            // The academic summaries are recalculated below in one pass, not through queued jobs.
            Event::fakeFor(
                fn () => $publish->execute($coordinator, Semester::query()->findOrFail($this->semesters[$term]), '127.0.0.1'),
                [StudentResultsChanged::class],
            );
        }
    }

    /** Attendance so far and the mid-term marks, at the review stage set in CURRENT_STAGES. */
    private function currentTerm(): void
    {
        $term = array_key_last(self::TERMS);
        $rows = [];

        foreach ($this->subjectsInTerm($term) as $code => $subject) {
            if ($status = self::CURRENT_STAGES[$code] ?? null) {
                $this->markClass($code, $subject, 'MID', $status);
            }

            // Two sessions a week: first subject Mon/Wed, second Tue/Thu, from 6 July to 6 November.
            $days = str_ends_with($code, '1') ? [Carbon::MONDAY, Carbon::WEDNESDAY] : [Carbon::TUESDAY, Carbon::THURSDAY];
            $dates = collect(Carbon::parse('2026-07-06')->daysUntil('2026-11-06'))
                ->filter(fn (Carbon $day) => in_array($day->dayOfWeek, $days, true));

            foreach ($this->students($subject['department']) as $student) {
                // Each student's overall attendance matches their profile; a few skip one subject more often.
                $rate = $student->attendance / 100 - ($this->chance("weak:{$student->id}:{$code}") < 0.15 ? 0.22 : 0.0);

                foreach ($dates as $date) {
                    $roll = $this->chance("att:{$student->id}:{$code}:{$date->toDateString()}");
                    $rows[] = [
                        'institution_id' => $this->institutionId, 'student_id' => $student->id, 'subject_id' => $subject['id'],
                        'faculty_id' => $this->faculty[$subject['department']], 'attendance_date' => $date->toDateString(),
                        'status' => $roll < $rate ? 'present' : ($roll < $rate + (1 - $rate) * 0.3 ? 'leave' : 'absent'),
                        'is_approved' => true, 'created_at' => $date, 'updated_at' => $date,
                    ];
                }
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('attendance')->insert($chunk);
        }
    }

    /** CGPA, backlogs and attendance per student, as the queued recalculation job would compute them. */
    private function summaries(): void
    {
        $recalculate = app(RecalculateAcademicSummaryAction::class);
        Student::query()->get()->each(fn (Student $student) => $recalculate->execute($student));
    }

    /**
     * Marks for every student of the subject's department, graded with the institution's
     * rules. Scores follow each student's CGPA, with some spread, a few fails and absences.
     *
     * @param  array{id: int, department: string, term: int, credits: int}  $subject
     */
    private function markClass(string $code, array $subject, string $examType, MarkStatus $status): void
    {
        $examId = DB::table('exams')
            ->join('exam_types', 'exam_types.id', '=', 'exams.exam_type_id')
            ->where('exams.subject_id', $subject['id'])->where('exam_types.code', $examType)
            ->value('exams.id');
        $scheme = MarkScheme::query()->where('subject_id', $subject['id'])->where('semester_id', $this->semesters[$subject['term']])->firstOrFail();
        $grader = new MarkGrader;
        $facultyId = $this->faculty[$subject['department']];
        $reviewerId = $subject['department'] === 'CSE' ? $this->hodId : $this->coordinatorId;
        $enteredAt = $examType === 'MID' ? Carbon::parse('2026-09-28 16:00') : Carbon::parse(self::TERMS[$subject['term']][6])->addDays(10);

        foreach ($this->students($subject['department']) as $student) {
            $seed = "{$student->id}:{$code}:{$examType}";
            $absent = $this->chance("absent:{$seed}") < 0.03;
            $failsExternal = ! $absent && $this->chance("fail:{$seed}") < ($student->cgpa < 7.8 ? 0.12 : 0.02);
            $percentage = max(35, min(98, $student->cgpa * 10 - 4 + ($this->chance("score:{$seed}") - 0.5) * 16));

            $entry = (new MarkEntry)->forceFill([
                'exam_id' => $examId, 'student_id' => $student->id, 'subject_id' => $subject['id'], 'mark_scheme_id' => $scheme->id,
                'internal_marks' => $absent ? null : round(min(40, $percentage * 0.4 + ($this->chance("int:{$seed}") - 0.3) * 6)),
                'external_marks' => $absent ? null : ($failsExternal ? 14 + round($this->chance("ext:{$seed}") * 8) : round(min(60, $percentage * 0.6))),
                'extra_marks' => 0, 'is_absent' => $absent, 'entered_by' => $facultyId,
            ]);
            $entry->setRelation('markScheme', $scheme);
            $grader->apply($entry);

            $reached = fn (MarkStatus $stage) => array_search($status, MarkStatus::cases(), true) >= array_search($stage, MarkStatus::cases(), true);
            $entry->forceFill([
                'status' => $status,
                'submitted_at' => $reached(MarkStatus::Submitted) ? $enteredAt : null,
                'verified_by' => $reached(MarkStatus::Verified) ? $reviewerId : null,
                'verified_at' => $reached(MarkStatus::Verified) ? $enteredAt->copy()->addDays(2) : null,
                'approved_by' => $reached(MarkStatus::Approved) ? $reviewerId : null,
                'approved_at' => $reached(MarkStatus::Approved) ? $enteredAt->copy()->addDays(4) : null,
            ])->save();
        }
    }

    /** @return array<string, array{id: int, department: string, term: int, credits: int}> */
    private function subjectsInTerm(int $term): array
    {
        return array_filter($this->subjects, fn (array $subject) => $subject['term'] === $term);
    }

    /** @return \Illuminate\Support\Collection<int, Student> */
    private function students(string $department)
    {
        $this->studentsByDepartment ??= Student::query()->orderBy('id')->get()->groupBy('department_code');

        return $this->studentsByDepartment->get($department, collect());
    }

    /** A stable pseudo-random number in [0, 1) for the key, so every run seeds the same data. */
    private function chance(string $key): float
    {
        return crc32($key) / 4294967296;
    }

    private function insert(string $table, array $row): int
    {
        return DB::table($table)->insertGetId([
            ...$row,
            'institution_id' => $this->institutionId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
