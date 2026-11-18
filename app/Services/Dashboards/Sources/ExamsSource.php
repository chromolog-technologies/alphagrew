<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Exam;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;

/**
 * The exam schedule. Students see the exams of their own department's subjects.
 */
class ExamsSource extends DataSource
{
    public function key(): string
    {
        return 'exams';
    }

    public function label(): string
    {
        return 'Exams';
    }

    public function description(): string
    {
        return 'One row per scheduled exam: subject, type, semester, date, mode and status.';
    }

    protected function baseQuery(): Builder
    {
        return Exam::query();
    }

    protected function primaryKey(): string
    {
        return 'exams.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('name', 'Exam', Field::STRING, 'exams.name'),
            Field::dimension('exam_date', 'Exam date', Field::DATE, 'exams.exam_date'),
            Field::dimension('status', 'Status', Field::STRING, 'exams.status', [], ['scheduled', 'conducted', 'cancelled', 'postponed']),
            Field::dimension('exam_mode', 'Mode', Field::STRING, 'exams.exam_mode', [], ['offline', 'online', 'hybrid']),
            Field::dimension('location', 'Location', Field::STRING, 'exams.location'),
            Field::dimension('subject', 'Subject', Field::STRING, 'sb.name', ['subject']),
            Field::dimension('subject_code', 'Subject code', Field::STRING, 'sb.code', ['subject']),
            Field::dimension('department', 'Department code', Field::STRING, 'sbd.code', ['subject_department']),
            Field::dimension('semester', 'Semester', Field::STRING, 'sem.name', ['semester']),
            Field::dimension('exam_type', 'Exam type', Field::STRING, 'et.name', ['exam_type']),
            Field::number('max_marks', 'Maximum marks', 'exams.max_marks'),
            Field::number('duration_minutes', 'Duration (minutes)', 'exams.duration_minutes'),
            Field::measure('upcoming', 'Upcoming exams', 'CASE WHEN exams.exam_date >= CURRENT_DATE THEN 1 ELSE 0 END', ['sum']),
        ];
    }

    protected function joins(): array
    {
        return [
            'subject' => [[], fn (Builder $q) => $q->leftJoin('subjects as sb', 'sb.id', '=', 'exams.subject_id')],
            'subject_department' => [['subject'], function (Builder $q): void {
                $q->leftJoin('courses as sc', 'sc.id', '=', 'sb.course_id')
                    ->leftJoin('departments as sbd', 'sbd.id', '=', 'sc.department_id');
            }],
            'semester' => [[], fn (Builder $q) => $q->leftJoin('semesters as sem', 'sem.id', '=', 'exams.semester_id')],
            'exam_type' => [[], fn (Builder $q) => $q->leftJoin('exam_types as et', 'et.id', '=', 'exams.exam_type_id')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return ['exam' => 'exams.id', 'subject' => 'exams.subject_id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SUBJECTS => $this->whereInOrNone($query, 'exams.subject_id', $scope->subjectIds),
            DashboardScope::SELF, DashboardScope::DEPARTMENT => $this->scopeToDepartments($query, $scope),
            default => $this->none($query),
        };
    }

    private function scopeToDepartments(Builder $query, DashboardScope $scope): void
    {
        $this->join($query, 'subject_department');
        $this->whereInOrNone($query, 'sbd.code', $scope->departmentCodes);
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $scope->level === DashboardScope::SELF
            || $user->can(CampusPermission::EXAMS_VIEW)
            || $user->can(CampusPermission::MARKS_VIEW);
    }
}
