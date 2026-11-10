<?php

namespace App\Services\Dashboards;

use App\Enums\UserRole;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAllocation;
use App\Models\User;
use App\Support\Campus\CampusPermission;

/**
 * Which rows a user's dashboards may read, decided from the account alone. Widget specs
 * cannot widen it. Tenant isolation (InstitutionScope) applies on top.
 *
 * - self:        a student; only their own records, and only published marks and results.
 * - subjects:    a teacher; the subjects allocated to them, and students of those subjects' departments.
 * - department:  an HOD (marks.approve with a department); their department.
 * - institution: admins, Exam Coordinators (marks.publish) and placement officers.
 * - none:        nothing (e.g. a student account without a student record).
 */
final class DashboardScope
{
    public const SELF = 'self';

    public const SUBJECTS = 'subjects';

    public const DEPARTMENT = 'department';

    public const INSTITUTION = 'institution';

    public const NONE = 'none';

    /**
     * @param  list<int>  $subjectIds
     * @param  list<string>  $departmentCodes
     */
    public function __construct(
        public readonly string $level,
        public readonly ?int $studentId = null,
        public readonly array $subjectIds = [],
        public readonly array $departmentCodes = [],
    ) {}

    public static function for(User $user): self
    {
        $role = $user->roleEnum();

        if ($role === UserRole::Student) {
            $student = Student::query()->where('user_id', $user->id)->first(['id', 'department_code']);

            return $student
                ? new self(self::SELF, $student->id, [], array_filter([$student->department_code]))
                : new self(self::NONE);
        }

        if ($user->isAdmin() || $role === UserRole::PlacementOfficer || $user->can(CampusPermission::MARKS_PUBLISH)) {
            return new self(self::INSTITUTION);
        }

        if ($role !== UserRole::Staff) {
            return new self(self::NONE);
        }

        if ($user->can(CampusPermission::MARKS_APPROVE) && filled($user->department_code)) {
            return new self(self::DEPARTMENT, null, [], [$user->department_code]);
        }

        $subjectIds = SubjectAllocation::query()
            ->where('faculty_id', $user->id)
            ->distinct()
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $departmentCodes = Subject::query()
            ->whereIn('subjects.id', $subjectIds)
            ->join('courses', 'courses.id', '=', 'subjects.course_id')
            ->join('departments', 'departments.id', '=', 'courses.department_id')
            ->distinct()
            ->pluck('departments.code')
            ->all();

        return new self(self::SUBJECTS, null, $subjectIds, $departmentCodes);
    }

    public function label(): string
    {
        return match ($this->level) {
            self::SELF => 'Your own records',
            self::SUBJECTS => 'Your allocated subjects',
            self::DEPARTMENT => 'Your department ('.implode(', ', $this->departmentCodes).')',
            self::INSTITUTION => 'Whole institution',
            default => 'No data',
        };
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return ['level' => $this->level, 'label' => $this->label()];
    }
}
