<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Department;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;

class DepartmentsSource extends DataSource
{
    public function key(): string
    {
        return 'departments';
    }

    public function label(): string
    {
        return 'Departments';
    }

    public function description(): string
    {
        return 'One row per department: code, status and intake capacity.';
    }

    protected function baseQuery(): Builder
    {
        return Department::query();
    }

    protected function primaryKey(): string
    {
        return 'departments.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('name', 'Department', Field::STRING, 'departments.name'),
            Field::dimension('code', 'Department code', Field::STRING, 'departments.code'),
            Field::dimension('status', 'Status', Field::STRING, 'departments.status', [], ['active', 'inactive']),
            Field::number('intake_capacity', 'Intake capacity', 'departments.intake_capacity'),
        ];
    }

    protected function joins(): array
    {
        return [];
    }

    protected function customFieldEntities(): array
    {
        return ['department' => 'departments.id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF, DashboardScope::SUBJECTS, DashboardScope::DEPARTMENT => $this->whereInOrNone($query, 'departments.code', $scope->departmentCodes),
            default => $this->none($query),
        };
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $user->can(CampusPermission::DEPARTMENTS_VIEW);
    }
}
