<?php

namespace App\Services\Dashboards\Sources;

use App\Enums\MarkStatus;
use App\Models\MarkEntry;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;

/**
 * Subject marks per student per exam. Students only ever see published (locked) marks.
 */
class MarksSource extends DataSource
{
    public function key(): string
    {
        return 'marks';
    }

    public function label(): string
    {
        return 'Marks';
    }

    public function description(): string
    {
        return 'One row per student per subject exam: internal, external and total marks, grade, result and workflow status.';
    }

    protected function baseQuery(): Builder
    {
        return MarkEntry::query();
    }

    protected function primaryKey(): string
    {
        return 'mark_entries.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('subject', 'Subject', Field::STRING, 'sb.name', ['subject']),
            Field::dimension('subject_code', 'Subject code', Field::STRING, 'sb.code', ['subject']),
            Field::dimension('department', 'Subject department', Field::STRING, 'sbd.code', ['subject_department']),
            Field::dimension('exam', 'Exam', Field::STRING, 'ex.name', ['exam']),
            Field::dimension('exam_date', 'Exam date', Field::DATE, 'ex.exam_date', ['exam']),
            Field::dimension('exam_type', 'Exam type', Field::STRING, 'et.name', ['exam_type']),
            Field::dimension('semester', 'Semester', Field::STRING, 'sem.name', ['semester']),
            Field::dimension('student', 'Student name', Field::STRING, 'st.name', ['student']),
            Field::dimension('registration_number', 'Registration number', Field::STRING, 'st.registration_number', ['student']),
            Field::dimension('student_department', 'Student department', Field::STRING, 'st.department_code', ['student']),
            Field::dimension('grade', 'Grade', Field::STRING, 'mark_entries.grade'),
            Field::dimension('result', 'Result', Field::STRING, 'mark_entries.result', [], ['PASS', 'FAIL']),
            Field::dimension('status', 'Workflow status', Field::STRING, 'mark_entries.status', [], MarkStatus::values()),
            Field::dimension('is_absent', 'Absent', Field::BOOLEAN, 'mark_entries.is_absent'),
            Field::dimension('entered_by', 'Entered by', Field::STRING, 'fu.name', ['faculty']),
            Field::number('total_marks', 'Total marks', 'mark_entries.total_marks'),
            Field::number('internal_marks', 'Internal marks', 'mark_entries.internal_marks'),
            Field::number('external_marks', 'External marks', 'mark_entries.external_marks'),
            Field::number('grade_point', 'Grade point', 'mark_entries.grade_point'),
            Field::measure('pass_pct', 'Pass %', "CASE WHEN mark_entries.result = 'PASS' THEN 100.0 ELSE 0 END", ['avg']),
            Field::measure('failures', 'Failures', "CASE WHEN mark_entries.result = 'FAIL' THEN 1 ELSE 0 END", ['sum']),
            Field::measure('absentees', 'Absentees', 'CASE WHEN mark_entries.is_absent = 1 THEN 1 ELSE 0 END', ['sum']),
            Field::measure('student_id', 'Students', 'mark_entries.student_id', ['count_distinct']),
        ];
    }

    protected function joins(): array
    {
        return [
            'student' => [[], fn (Builder $q) => $q->join('students as st', function (JoinClause $join): void {
                $join->on('st.id', '=', 'mark_entries.student_id')->whereNull('st.deleted_at');
            })],
            'subject' => [[], fn (Builder $q) => $q->leftJoin('subjects as sb', 'sb.id', '=', 'mark_entries.subject_id')],
            'subject_department' => [['subject'], function (Builder $q): void {
                $q->leftJoin('courses as sc', 'sc.id', '=', 'sb.course_id')
                    ->leftJoin('departments as sbd', 'sbd.id', '=', 'sc.department_id');
            }],
            'exam' => [[], fn (Builder $q) => $q->leftJoin('exams as ex', 'ex.id', '=', 'mark_entries.exam_id')],
            'exam_type' => [['exam'], fn (Builder $q) => $q->leftJoin('exam_types as et', 'et.id', '=', 'ex.exam_type_id')],
            'semester' => [['exam'], fn (Builder $q) => $q->leftJoin('semesters as sem', 'sem.id', '=', 'ex.semester_id')],
            'faculty' => [[], fn (Builder $q) => $q->leftJoin('users as fu', 'fu.id', '=', 'mark_entries.entered_by')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return [
            'student' => 'mark_entries.student_id',
            'subject' => 'mark_entries.subject_id',
            'exam' => 'mark_entries.exam_id',
            'staff' => 'mark_entries.entered_by',
        ];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF => $query->where('mark_entries.student_id', $scope->studentId)
                ->where('mark_entries.status', MarkStatus::Locked->value),
            DashboardScope::SUBJECTS => $this->whereInOrNone($query, 'mark_entries.subject_id', $scope->subjectIds),
            DashboardScope::DEPARTMENT => $this->scopeToDepartments($query, $scope),
            default => $this->none($query),
        };
    }

    /** HODs see their department's subjects, as in MarkEntryRepository::visibleTo(). */
    private function scopeToDepartments(Builder $query, DashboardScope $scope): void
    {
        $this->join($query, 'subject_department');
        $this->whereInOrNone($query, 'sbd.code', $scope->departmentCodes);
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $user->can(CampusPermission::MARKS_VIEW);
    }
}
