<?php

namespace App\Services\Dashboards;

use App\Enums\UserRole;
use App\Models\User;
use App\Support\Campus\CampusPermission;

/**
 * The built-in dashboards, one per audience. Each user lands on the template for their
 * role until they (or an admin, by sharing) choose another dashboard. Users can copy a
 * template into their own dashboard and change it.
 *
 * Grid: 12 columns; KPI tiles are 3×2, charts 6×4, tables 6×5 or 12×5.
 */
final class DashboardTemplates
{
    public const STUDENT = 'student';

    public const TEACHER = 'teacher';

    public const HOD = 'hod';

    public const EXAMINATION = 'examination';

    public const MANAGEMENT = 'management';

    /** The template a user starts on. */
    public static function keyFor(User $user): string
    {
        $role = $user->roleEnum();

        return match (true) {
            $role === UserRole::Student => self::STUDENT,
            $user->isAdmin(), $role === UserRole::PlacementOfficer => self::MANAGEMENT,
            $user->can(CampusPermission::MARKS_PUBLISH) => self::EXAMINATION,
            $user->can(CampusPermission::MARKS_APPROVE) && filled($user->department_code) => self::HOD,
            default => self::TEACHER,
        };
    }

    /**
     * Templates a user may open. They only make sense at the user's own level or below,
     * e.g. an HOD can also use the Teacher view, a student only the Student view.
     *
     * @return list<string>
     */
    public static function keysFor(User $user): array
    {
        return match (self::keyFor($user)) {
            self::STUDENT => [self::STUDENT],
            self::TEACHER => [self::TEACHER],
            self::HOD => [self::HOD, self::TEACHER],
            self::EXAMINATION => [self::EXAMINATION, self::HOD, self::TEACHER],
            default => $user->isAdmin()
                ? [self::MANAGEMENT, self::EXAMINATION, self::HOD, self::TEACHER, self::STUDENT]
                : [self::MANAGEMENT],
        };
    }

    /** @return array{key: string, name: string, description: string, widgets: list<array<string, mixed>>}|null */
    public static function get(string $key): ?array
    {
        $template = self::definitions()[$key] ?? null;

        return $template ? ['key' => $key, ...$template] : null;
    }

    /** @return array<string, array{name: string, description: string, widgets: list<array<string, mixed>>}> */
    private static function definitions(): array
    {
        return [
            self::STUDENT => [
                'name' => 'My academic progress',
                'description' => 'Your attendance, marks, results and the subjects that need attention.',
                'widgets' => [
                    self::kpi('cgpa', 'CGPA', 'students', 'cgpa', 'avg', 0, ['format' => 'decimal']),
                    self::kpi('attendance', 'Attendance', 'attendance', 'present_pct', 'avg', 3, ['format' => 'percent', 'target' => 75]),
                    self::kpi('backlogs', 'Active backlogs', 'students', 'active_backlogs', 'max', 6),
                    self::kpi('absences', 'Classes missed', 'attendance', 'absent', 'sum', 9),
                    self::chart('attendance-by-subject', 'Attendance by subject', 'bar', 'attendance', [['field' => 'present_pct', 'agg' => 'avg']], [['field' => 'subject']], 0, 2, options: ['format' => 'percent', 'target' => 75]),
                    self::chart('marks-by-subject', 'Marks by subject (published)', 'bar', 'marks', [['field' => 'total_marks', 'agg' => 'avg']], [['field' => 'subject']], 6, 2),
                    self::chart('sgpa-trend', 'SGPA by semester', 'line', 'semester_results', [['field' => 'sgpa', 'agg' => 'avg']], [['field' => 'semester']], 0, 6, options: ['format' => 'decimal']),
                    self::chart('low-attendance', 'Subjects below 75% attendance', 'table', 'attendance', [['field' => 'present_pct', 'agg' => 'avg']], [['field' => 'subject']], 6, 6,
                        having: [['measure' => 0, 'op' => '<', 'value' => 75]], sort: ['by' => 'm0', 'dir' => 'asc'], options: ['format' => 'percent']),
                    self::chart('not-cleared', 'Subjects not cleared', 'table', 'marks', [['field' => 'records', 'agg' => 'count', 'label' => 'Attempts']], [['field' => 'subject'], ['field' => 'exam']], 0, 10,
                        filters: [['field' => 'result', 'op' => '=', 'value' => 'FAIL']]),
                    self::chart('upcoming-exams', 'Upcoming exams', 'list', 'exams', [['field' => 'records', 'agg' => 'count']], [['field' => 'exam_date', 'grain' => 'day'], ['field' => 'name']], 6, 10,
                        filters: [['field' => 'exam_date', 'op' => 'next_days', 'value' => 60]], sort: ['by' => 'd0', 'dir' => 'asc']),
                ],
            ],

            self::TEACHER => [
                'name' => 'My classes',
                'description' => 'Attendance and performance in the subjects you teach, and marks still to enter.',
                'widgets' => [
                    self::kpi('students', 'Students taught', 'attendance', 'student_id', 'count_distinct', 0),
                    self::kpi('attendance', 'Average attendance', 'attendance', 'present_pct', 'avg', 3, ['format' => 'percent', 'target' => 75]),
                    self::kpi('pass-rate', 'Pass rate', 'marks', 'pass_pct', 'avg', 6, ['format' => 'percent']),
                    self::kpi('drafts', 'Mark entries in draft', 'marks', 'records', 'count', 9, filters: [['field' => 'status', 'op' => '=', 'value' => 'draft']]),
                    self::chart('attendance-by-subject', 'Attendance by subject', 'bar', 'attendance', [['field' => 'present_pct', 'agg' => 'avg']], [['field' => 'subject']], 0, 2, options: ['format' => 'percent', 'target' => 75]),
                    self::chart('marks-by-subject', 'Average marks by subject', 'bar', 'marks', [['field' => 'total_marks', 'agg' => 'avg']], [['field' => 'subject']], 6, 2),
                    self::chart('low-attendance', 'Students below 75% attendance', 'table', 'attendance', [['field' => 'present_pct', 'agg' => 'avg']], [['field' => 'student'], ['field' => 'subject']], 0, 6,
                        having: [['measure' => 0, 'op' => '<', 'value' => 75]], sort: ['by' => 'm0', 'dir' => 'asc'], options: ['format' => 'percent']),
                    self::chart('entry-status', 'Mark entry status', 'pie', 'marks', [['field' => 'records', 'agg' => 'count']], [['field' => 'status']], 6, 6),
                    self::chart('attendance-trend', 'Attendance by month', 'line', 'attendance', [['field' => 'present_pct', 'agg' => 'avg']], [['field' => 'date', 'grain' => 'month']], 0, 11, w: 12, options: ['format' => 'percent']),
                ],
            ],

            self::HOD => [
                'name' => 'Department overview',
                'description' => 'Your department’s results, attendance, faculty progress on marks and students at risk.',
                'widgets' => [
                    self::kpi('students', 'Students', 'students', 'records', 'count', 0),
                    self::kpi('cgpa', 'Average CGPA', 'students', 'cgpa', 'avg', 3, ['format' => 'decimal']),
                    self::kpi('pass-rate', 'Pass rate', 'marks', 'pass_pct', 'avg', 6, ['format' => 'percent']),
                    self::kpi('attendance', 'Average attendance', 'attendance', 'present_pct', 'avg', 9, ['format' => 'percent', 'target' => 75]),
                    self::chart('pass-by-subject', 'Pass % by subject', 'bar', 'marks', [['field' => 'pass_pct', 'agg' => 'avg']], [['field' => 'subject']], 0, 2, options: ['format' => 'percent']),
                    self::chart('result-trend', 'Results by semester', 'line', 'semester_results', [['field' => 'pass_pct', 'agg' => 'avg'], ['field' => 'sgpa', 'agg' => 'avg']], [['field' => 'semester']], 6, 2),
                    self::chart('awaiting-approval', 'Marks awaiting your review', 'table', 'marks', [['field' => 'records', 'agg' => 'count', 'label' => 'Entries']], [['field' => 'subject'], ['field' => 'status']], 0, 6,
                        filters: [['field' => 'status', 'op' => 'in', 'value' => ['submitted', 'verified']]]),
                    self::chart('faculty-progress', 'Faculty mark entry progress', 'bar', 'marks', [['field' => 'records', 'agg' => 'count']], [['field' => 'entered_by'], ['field' => 'status']], 6, 6, options: ['stacked' => true]),
                    self::chart('at-risk', 'Students below 75% attendance', 'table', 'students', [['field' => 'attendance_pct', 'agg' => 'avg', 'label' => 'Attendance %'], ['field' => 'cgpa', 'agg' => 'avg', 'label' => 'CGPA']], [['field' => 'name'], ['field' => 'year']], 0, 11, w: 12,
                        filters: [['field' => 'attendance_pct', 'op' => '<', 'value' => 75]], sort: ['by' => 'm0', 'dir' => 'asc']),
                ],
            ],

            self::EXAMINATION => [
                'name' => 'Examination control',
                'description' => 'The exam schedule, the marks pipeline from draft to publication, and absentees.',
                'widgets' => [
                    self::kpi('upcoming', 'Upcoming exams', 'exams', 'upcoming', 'sum', 0),
                    self::kpi('to-verify', 'Entries awaiting verification', 'marks', 'records', 'count', 3, filters: [['field' => 'status', 'op' => '=', 'value' => 'submitted']]),
                    self::kpi('published', 'Semester results published', 'semester_results', 'records', 'count', 6, filters: [['field' => 'is_published', 'op' => '=', 'value' => true]]),
                    self::kpi('absentees', 'Absentees', 'marks', 'absentees', 'sum', 9),
                    self::chart('schedule', 'Exams in the next 30 days', 'list', 'exams', [['field' => 'records', 'agg' => 'count']], [['field' => 'exam_date', 'grain' => 'day'], ['field' => 'name']], 0, 2,
                        filters: [['field' => 'exam_date', 'op' => 'next_days', 'value' => 30]], sort: ['by' => 'd0', 'dir' => 'asc']),
                    self::chart('exam-status', 'Exams by status', 'pie', 'exams', [['field' => 'records', 'agg' => 'count']], [['field' => 'status']], 6, 2),
                    self::chart('pipeline', 'Mark entry pipeline', 'bar', 'marks', [['field' => 'records', 'agg' => 'count', 'label' => 'Entries']], [['field' => 'status']], 0, 6),
                    self::chart('pipeline-by-semester', 'Pipeline by semester', 'table', 'marks', [['field' => 'records', 'agg' => 'count', 'label' => 'Entries']], [['field' => 'semester'], ['field' => 'status']], 6, 6),
                    self::chart('absentees-by-subject', 'Absentees by subject', 'bar', 'marks', [['field' => 'absentees', 'agg' => 'sum']], [['field' => 'subject']], 0, 11, w: 12,
                        sort: ['by' => 'm0', 'dir' => 'desc']),
                ],
            ],

            self::MANAGEMENT => [
                'name' => 'Institution overview',
                'description' => 'Institution-wide performance at a glance, compared across departments.',
                'widgets' => [
                    self::kpi('students', 'Students', 'students', 'records', 'count', 0),
                    self::kpi('cgpa', 'Average CGPA', 'students', 'cgpa', 'avg', 3, ['format' => 'decimal']),
                    self::kpi('pass-rate', 'Semester pass rate', 'semester_results', 'pass_pct', 'avg', 6, ['format' => 'percent']),
                    self::kpi('attendance', 'Average attendance', 'attendance', 'present_pct', 'avg', 9, ['format' => 'percent', 'target' => 75]),
                    self::chart('department-comparison', 'Departments: CGPA and attendance', 'bar', 'students', [['field' => 'cgpa', 'agg' => 'avg'], ['field' => 'attendance_pct', 'agg' => 'avg']], [['field' => 'department']], 0, 2),
                    self::chart('pass-by-department', 'Pass % by department', 'bar', 'marks', [['field' => 'pass_pct', 'agg' => 'avg']], [['field' => 'department']], 6, 2, options: ['format' => 'percent']),
                    self::chart('result-trend', 'Pass % by semester', 'line', 'semester_results', [['field' => 'pass_pct', 'agg' => 'avg']], [['field' => 'semester']], 0, 6, options: ['format' => 'percent']),
                    self::chart('status-mix', 'Student status', 'pie', 'students', [['field' => 'records', 'agg' => 'count']], [['field' => 'status']], 6, 6),
                    self::chart('at-risk', 'Students below 75% attendance, by department', 'table', 'students', [['field' => 'records', 'agg' => 'count', 'label' => 'Students']], [['field' => 'department']], 0, 10, w: 12,
                        filters: [['field' => 'attendance_pct', 'op' => '<', 'value' => 75]], sort: ['by' => 'm0', 'dir' => 'desc']),
                ],
            ],
        ];
    }

    private static function kpi(string $id, string $title, string $source, string $field, string $agg, int $x, array $options = [], array $filters = []): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'type' => 'kpi',
            'spec' => ['source' => $source, 'measures' => [['field' => $field, 'agg' => $agg]], 'dimensions' => [], 'filters' => $filters],
            'layout' => ['x' => $x, 'y' => 0, 'w' => 3, 'h' => 2],
            'options' => $options,
        ];
    }

    private static function chart(
        string $id,
        string $title,
        string $type,
        string $source,
        array $measures,
        array $dimensions,
        int $x,
        int $y,
        array $filters = [],
        array $having = [],
        ?array $sort = null,
        array $options = [],
        int $w = 6,
    ): array {
        return [
            'id' => $id,
            'title' => $title,
            'type' => $type,
            'spec' => array_filter([
                'source' => $source,
                'measures' => $measures,
                'dimensions' => $dimensions,
                'filters' => $filters,
                'having' => $having,
                'sort' => $sort,
                'limit' => in_array($type, ['table', 'list'], true) ? 50 : 100,
            ], fn ($value) => $value !== null),
            'layout' => ['x' => $x, 'y' => $y, 'w' => $w, 'h' => in_array($type, ['table', 'list'], true) ? 5 : 4],
            'options' => $options,
        ];
    }
}
