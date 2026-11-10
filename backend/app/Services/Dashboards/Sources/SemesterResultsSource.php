<?php

namespace App\Services\Dashboards\Sources;

use App\Models\SemesterResult;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;

/**
 * Semester results (SGPA) per student. Students and teachers only see published results.
 */
class SemesterResultsSource extends DataSource
{
    public function key(): string
    {
        return 'semester_results';
    }

    public function label(): string
    {
        return 'Semester results';
    }

    public function description(): string
    {
        return 'One row per student per semester: SGPA, percentage, subjects passed and failed, and publication status.';
    }

    protected function baseQuery(): Builder
    {
        return SemesterResult::query();
    }

    protected function primaryKey(): string
    {
        return 'semester_results.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('semester', 'Semester', Field::STRING, 'sem.name', ['semester']),
            Field::number('semester_number', 'Semester number', 'sem.semester_number', ['semester'], ['min', 'max']),
            Field::dimension('student', 'Student name', Field::STRING, 'st.name', ['student']),
            Field::dimension('registration_number', 'Registration number', Field::STRING, 'st.registration_number', ['student']),
            Field::dimension('department', 'Department code', Field::STRING, 'st.department_code', ['student']),
            Field::dimension('year', 'Year of study', Field::STRING, 'st.year', ['student']),
            Field::dimension('result', 'Result', Field::STRING, 'semester_results.result', [], [SemesterResult::STATUS_PASS, SemesterResult::STATUS_FAIL]),
            Field::dimension('overall_grade', 'Overall grade', Field::STRING, 'semester_results.overall_grade'),
            Field::dimension('is_published', 'Published', Field::BOOLEAN, 'semester_results.is_published'),
            Field::number('sgpa', 'SGPA', 'semester_results.sgpa'),
            Field::number('percentage', 'Percentage', 'semester_results.percentage'),
            Field::number('subjects_failed', 'Subjects failed', 'semester_results.subjects_failed'),
            Field::number('subjects_passed', 'Subjects passed', 'semester_results.subjects_passed'),
            Field::measure('pass_pct', 'Pass %', "CASE WHEN semester_results.result = 'PASS' THEN 100.0 ELSE 0 END", ['avg']),
            Field::measure('student_id', 'Students', 'semester_results.student_id', ['count_distinct']),
        ];
    }

    protected function joins(): array
    {
        return [
            'student' => [[], fn (Builder $q) => $q->join('students as st', function (JoinClause $join): void {
                $join->on('st.id', '=', 'semester_results.student_id')->whereNull('st.deleted_at');
            })],
            'semester' => [[], fn (Builder $q) => $q->leftJoin('semesters as sem', 'sem.id', '=', 'semester_results.semester_id')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return ['student' => 'semester_results.student_id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF => $query->where('semester_results.student_id', $scope->studentId)
                ->where('semester_results.is_published', true),
            DashboardScope::SUBJECTS => $this->scopeToDepartments($query->where('semester_results.is_published', true), $scope),
            DashboardScope::DEPARTMENT => $this->scopeToDepartments($query, $scope),
            default => $this->none($query),
        };
    }

    private function scopeToDepartments(Builder $query, DashboardScope $scope): void
    {
        $this->join($query, 'student');
        $this->whereInOrNone($query, 'st.department_code', $scope->departmentCodes);
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $user->can(CampusPermission::MARKS_VIEW) || $user->can(CampusPermission::RESULTS_VIEW_SUMMARY);
    }
}
