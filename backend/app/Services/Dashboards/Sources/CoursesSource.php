<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Course;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;

class CoursesSource extends DataSource
{
    public function key(): string
    {
        return 'courses';
    }

    public function label(): string
    {
        return 'Courses';
    }

    public function description(): string
    {
        return 'One row per course: department, level, type, semesters, intake and fees.';
    }

    protected function baseQuery(): Builder
    {
        return Course::query();
    }

    protected function primaryKey(): string
    {
        return 'courses.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('name', 'Course', Field::STRING, 'courses.name'),
            Field::dimension('code', 'Course code', Field::STRING, 'courses.code'),
            Field::dimension('department', 'Department code', Field::STRING, 'cd.code', ['department']),
            Field::dimension('department_name', 'Department', Field::STRING, 'cd.name', ['department']),
            Field::dimension('course_type', 'Course type', Field::STRING, 'courses.course_type', [], ['UG', 'PG', 'Diploma', 'Certification']),
            Field::dimension('academic_level', 'Academic level', Field::STRING, 'courses.academic_level', [], ['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate']),
            Field::dimension('mode', 'Mode', Field::STRING, 'courses.mode', [], ['Full-Time', 'Part-Time', 'Distance', 'Hybrid']),
            Field::dimension('is_active', 'Active', Field::BOOLEAN, 'courses.is_active'),
            Field::number('total_semesters', 'Semesters', 'courses.total_semesters'),
            Field::number('intake_capacity', 'Intake capacity', 'courses.intake_capacity'),
            Field::number('total_fees', 'Total fees', 'courses.total_fees'),
        ];
    }

    protected function joins(): array
    {
        return [
            'department' => [[], fn (Builder $q) => $q->leftJoin('departments as cd', 'cd.id', '=', 'courses.department_id')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return ['course' => 'courses.id', 'department' => 'courses.department_id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF, DashboardScope::SUBJECTS, DashboardScope::DEPARTMENT => $this->scopeToDepartments($query, $scope),
            default => $this->none($query),
        };
    }

    private function scopeToDepartments(Builder $query, DashboardScope $scope): void
    {
        $this->join($query, 'department');
        $this->whereInOrNone($query, 'cd.code', $scope->departmentCodes);
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $user->can(CampusPermission::DEPARTMENTS_VIEW);
    }
}
