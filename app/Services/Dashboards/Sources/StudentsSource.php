<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Student;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusMasterCatalog;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;

class StudentsSource extends DataSource
{
    public function key(): string
    {
        return 'students';
    }

    public function label(): string
    {
        return 'Students';
    }

    public function description(): string
    {
        return 'One row per student: department, year, status, CGPA, attendance and backlogs.';
    }

    protected function baseQuery(): Builder
    {
        return Student::query();
    }

    protected function primaryKey(): string
    {
        return 'students.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('name', 'Student name', Field::STRING, 'students.name'),
            Field::dimension('registration_number', 'Registration number', Field::STRING, 'students.registration_number'),
            Field::dimension('department', 'Department code', Field::STRING, 'students.department_code'),
            Field::dimension('department_name', 'Department', Field::STRING, 'std.name', ['department']),
            Field::dimension('year', 'Year of study', Field::STRING, 'students.year', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_YEAR)),
            Field::dimension('status', 'Status', Field::STRING, 'students.status', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_STATUS)),
            Field::dimension('gender', 'Gender', Field::STRING, 'students.gender', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_GENDER)),
            Field::dimension('fee_status', 'Fee status', Field::STRING, 'students.fee_status', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::PAYMENT_STATUS)),
            Field::dimension('batch', 'Batch', Field::STRING, 'bt.name', ['batch']),
            Field::dimension('placed_company', 'Placed company', Field::STRING, 'students.placed_company'),
            Field::number('cgpa', 'CGPA', 'COALESCE(sas.cgpa, students.cgpa)', ['summary']),
            Field::number('attendance_pct', 'Attendance %', 'COALESCE(sas.attendance_percentage, students.attendance)', ['summary']),
            Field::number('active_backlogs', 'Active backlogs', 'COALESCE(sas.active_backlogs, 0)', ['summary']),
        ];
    }

    protected function joins(): array
    {
        return [
            'summary' => [[], fn (Builder $q) => $q->leftJoin('student_academic_summaries as sas', 'sas.student_id', '=', 'students.id')],
            'department' => [[], fn (Builder $q) => $this->joinDepartmentByCode($q, 'std', 'students.department_code', 'students.institution_id')],
            'batch' => [[], fn (Builder $q) => $q->leftJoin('batches as bt', 'bt.id', '=', 'students.batch_id')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return ['student' => 'students.id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF => $query->where('students.id', $scope->studentId),
            DashboardScope::SUBJECTS, DashboardScope::DEPARTMENT => $this->whereInOrNone($query, 'students.department_code', $scope->departmentCodes),
            default => $this->none($query),
        };
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $scope->level === DashboardScope::SELF || $user->can(CampusPermission::STUDENTS_VIEW);
    }
}
