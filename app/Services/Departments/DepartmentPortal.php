<?php

namespace App\Services\Departments;

use App\Enums\MarkStatus;
use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\JobApplication;
use App\Models\MarkEntry;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAllocation;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Real figures for one department: the staff portal's overview, reports and staff list.
 * Every query goes through tenant-scoped models, so nothing leaks across institutions.
 */
class DepartmentPortal
{
    /** @return array<string, mixed> */
    public function summary(Department $department): array
    {
        $code = $department->code;
        $students = Student::query()->where('department_code', $code);
        $studentIds = (clone $students)->pluck('id');

        $courses = Course::query()->where('department_id', $department->id)->withCount('subjects')->orderBy('name')->get(['id', 'name', 'code', 'total_semesters']);
        $subjectIds = $this->subjectIds($department);

        $total = $studentIds->count();
        $placed = (clone $students)->whereNotNull('placed_company')->count();

        $byYear = (clone $students)
            ->select('year', DB::raw('COUNT(*) as students'), DB::raw('AVG(cgpa) as avg_cgpa'))
            ->groupBy('year')
            ->orderBy('year')
            ->get()
            ->map(fn ($row) => ['year' => $row->year, 'students' => (int) $row->students, 'averageCgpa' => round((float) $row->avg_cgpa, 2)])
            ->all();

        return [
            'department' => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $code,
                'hodName' => $department->hod ? trim($department->hod->first_name.' '.$department->hod->last_name) ?: $department->hod->name : null,
                'intakeCapacity' => $department->intake_capacity,
            ],
            'counts' => [
                'students' => $total,
                'staff' => User::query()->where('department_code', $code)->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])->count(),
                'courses' => $courses->count(),
                'subjects' => $subjectIds->count(),
                'upcomingExams' => Exam::query()->whereIn('subject_id', $subjectIds)->whereDate('exam_date', '>=', now()->toDateString())->where('status', 'scheduled')->count(),
            ],
            'averages' => [
                'cgpa' => round((float) (clone $students)->avg('cgpa'), 2),
                'attendance' => round((float) (clone $students)->avg('attendance'), 1),
                'placementRate' => $total > 0 ? round($placed / $total * 100, 1) : 0.0,
            ],
            'placedStudents' => $placed,
            'studentsByYear' => $byYear,
            'courses' => $courses->map(fn (Course $c) => ['id' => $c->id, 'name' => $c->name, 'code' => $c->code, 'semesters' => $c->total_semesters, 'subjects' => $c->subjects_count])->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function reports(Department $department): array
    {
        $subjects = Subject::query()->whereIn('id', $this->subjectIds($department))->orderBy('code')->get(['id', 'name', 'code']);
        $ids = $subjects->pluck('id');

        // Published results only (locked), like the student results pages.
        $marks = MarkEntry::query()
            ->whereIn('subject_id', $ids)
            ->where('status', MarkStatus::Locked->value)
            ->select('subject_id', DB::raw('COUNT(*) as students'), DB::raw('AVG(total_marks) as average'), DB::raw("SUM(CASE WHEN result = '".MarkEntry::RESULT_PASS."' THEN 1 ELSE 0 END) as passed"))
            ->groupBy('subject_id')
            ->get()
            ->keyBy('subject_id');

        $attendance = Attendance::query()
            ->whereIn('subject_id', $ids)
            ->select('subject_id', DB::raw('COUNT(*) as records'), DB::raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present"))
            ->groupBy('subject_id')
            ->get()
            ->keyBy('subject_id');

        $studentIds = Student::query()->where('department_code', $department->code)->pluck('id');
        $offers = JobApplication::query()->whereIn('student_id', $studentIds)->whereNotNull('offered_at');
        $topCompanies = Student::query()
            ->whereIn('id', $studentIds)
            ->whereNotNull('placed_company')
            ->select('placed_company', DB::raw('COUNT(*) as students'))
            ->groupBy('placed_company')
            ->orderByDesc('students')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['company' => $row->placed_company, 'students' => (int) $row->students])
            ->all();
        $placed = Student::query()->whereIn('id', $studentIds)->whereNotNull('placed_company')->count();

        return [
            'academic' => $subjects->map(function (Subject $s) use ($marks) {
                $row = $marks->get($s->id);
                $students = (int) ($row->students ?? 0);

                return [
                    'subjectId' => $s->id, 'code' => $s->code, 'name' => $s->name, 'students' => $students,
                    'averageMarks' => $students ? round((float) $row->average, 1) : null,
                    'passPercentage' => $students ? round((int) $row->passed / $students * 100, 1) : null,
                ];
            })->values()->all(),
            'attendance' => $subjects->map(function (Subject $s) use ($attendance) {
                $row = $attendance->get($s->id);
                $records = (int) ($row->records ?? 0);

                return [
                    'subjectId' => $s->id, 'code' => $s->code, 'name' => $s->name, 'records' => $records,
                    'presentPercentage' => $records ? round((int) $row->present / $records * 100, 1) : null,
                ];
            })->values()->all(),
            'placement' => [
                'students' => $studentIds->count(),
                'placed' => $placed,
                'placementRate' => $studentIds->count() ? round($placed / $studentIds->count() * 100, 1) : 0.0,
                'offers' => (clone $offers)->count(),
                'averageOfferLpa' => round((float) (clone $offers)->avg('offer_ctc_lpa'), 2),
                'highestOfferLpa' => (float) ((clone $offers)->max('offer_ctc_lpa') ?? 0),
                'topCompanies' => $topCompanies,
            ],
        ];
    }

    /**
     * The department's staff with what they teach.
     *
     * @return list<array<string, mixed>>
     */
    public function staff(Department $department): array
    {
        $staff = User::query()
            ->with('designation:id,name')
            ->where('department_code', $department->code)
            ->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])
            ->orderBy('name')
            ->get();

        $allocations = SubjectAllocation::query()
            ->with(['subject:id,code,name', 'semester:id,name'])
            ->whereIn('faculty_id', $staff->pluck('id'))
            ->get()
            ->groupBy('faculty_id');

        return $staff->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'phone' => $u->phone,
            'designationId' => $u->designation_id,
            'designationName' => $u->designation?->name,
            'subjects' => ($allocations->get($u->id) ?? collect())->map(fn (SubjectAllocation $a) => [
                'code' => $a->subject?->code, 'name' => $a->subject?->name, 'semester' => $a->semester?->name,
            ])->values()->all(),
        ])->values()->all();
    }

    /** @return Collection<int, int> */
    private function subjectIds(Department $department): Collection
    {
        return Subject::query()->whereIn('course_id', Course::query()->where('department_id', $department->id)->select('id'))->pluck('id');
    }
}
