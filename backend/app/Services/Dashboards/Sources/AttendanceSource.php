<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Attendance;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;

class AttendanceSource extends DataSource
{
    public function key(): string
    {
        return 'attendance';
    }

    public function label(): string
    {
        return 'Attendance';
    }

    public function description(): string
    {
        return 'One row per student per class session: date, subject, status and who marked it.';
    }

    protected function baseQuery(): Builder
    {
        return Attendance::query();
    }

    protected function primaryKey(): string
    {
        return 'attendance.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('date', 'Date', Field::DATE, 'attendance.attendance_date'),
            Field::dimension('status', 'Status', Field::STRING, 'attendance.status', [], ['present', 'absent', 'leave', 'other']),
            Field::dimension('is_approved', 'Approved', Field::BOOLEAN, 'attendance.is_approved'),
            Field::dimension('subject', 'Subject', Field::STRING, 'sb.name', ['subject']),
            Field::dimension('subject_code', 'Subject code', Field::STRING, 'sb.code', ['subject']),
            Field::dimension('student', 'Student name', Field::STRING, 'st.name', ['student']),
            Field::dimension('registration_number', 'Registration number', Field::STRING, 'st.registration_number', ['student']),
            Field::dimension('department', 'Department code', Field::STRING, 'st.department_code', ['student']),
            Field::dimension('year', 'Year of study', Field::STRING, 'st.year', ['student']),
            Field::dimension('faculty', 'Marked by', Field::STRING, 'fu.name', ['faculty']),
            Field::measure('present_pct', 'Present %', "CASE WHEN attendance.status = 'present' THEN 100.0 ELSE 0 END", ['avg']),
            Field::measure('absent', 'Absences', "CASE WHEN attendance.status = 'absent' THEN 1 ELSE 0 END", ['sum']),
            Field::measure('student_id', 'Students', 'attendance.student_id', ['count_distinct']),
        ];
    }

    protected function joins(): array
    {
        return [
            'student' => [[], fn (Builder $q) => $q->join('students as st', function (JoinClause $join): void {
                $join->on('st.id', '=', 'attendance.student_id')->whereNull('st.deleted_at');
            })],
            'subject' => [[], fn (Builder $q) => $q->leftJoin('subjects as sb', 'sb.id', '=', 'attendance.subject_id')],
            'faculty' => [[], fn (Builder $q) => $q->leftJoin('users as fu', 'fu.id', '=', 'attendance.faculty_id')],
        ];
    }

    protected function customFieldEntities(): array
    {
        return ['student' => 'attendance.student_id', 'subject' => 'attendance.subject_id', 'staff' => 'attendance.faculty_id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        match ($scope->level) {
            DashboardScope::INSTITUTION => null,
            DashboardScope::SELF => $query->where('attendance.student_id', $scope->studentId),
            DashboardScope::SUBJECTS => $this->whereInOrNone($query, 'attendance.subject_id', $scope->subjectIds),
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
        return $user->can(CampusPermission::ATTENDANCE_VIEW);
    }
}
