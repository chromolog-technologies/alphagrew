<?php

namespace App\Repositories;

use App\Models\MarkEntry;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Reads shared by marks entry, review and publishing.
 */
class MarkEntryRepository
{
    /**
     * Mark entries the user may see. Admins and holders of marks.publish (Exam Coordinator)
     * see the whole institution; everyone else only subjects of their own department.
     */
    public function visibleTo(User $user): Builder
    {
        return MarkEntry::query()->when(
            ! $user->can(CampusPermission::MARKS_PUBLISH),
            fn (Builder $query) => $query->whereHas(
                'subject.course.department',
                fn (Builder $department) => $department->where('code', $user->department_code),
            ),
        );
    }

    /**
     * The students expected to have marks for a subject: those in the subject's department
     * whose year of study matches its semester (semesters 1–2 → year 1, 3–4 → year 2, ...).
     * Students only record a department and a year, so this is the class roster.
     *
     * @return Collection<int, Student>
     */
    public function rosterFor(Subject $subject): Collection
    {
        $departmentCode = $subject->department?->code;

        if ($departmentCode === null) {
            return collect();
        }

        $year = $subject->semester_number ? (int) ceil($subject->semester_number / 2) : null;

        return Student::query()
            ->where('department_code', $departmentCode)
            ->orderBy('registration_number')
            ->get()
            ->filter(fn (Student $student) => $year === null || $this->yearOfStudy($student) === $year)
            ->values();
    }

    /** "4th Year", "year_4" and "4" all mean 4. */
    private function yearOfStudy(Student $student): ?int
    {
        return preg_match('/\d+/', (string) $student->year, $match) ? (int) $match[0] : null;
    }
}
