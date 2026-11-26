<?php

namespace App\Support\Academics;

use App\Models\Course;
use App\Models\Department;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAllocation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Which subjects a student takes and who teaches a subject. Same rule as the mark-entry roster
 * (MarkEntryRepository::rosterFor): a subject belongs to its course's department and to year
 * ceil(semester / 2); students record a department and a year of study.
 */
final class StudentSubjects
{
    /** @return Builder<Subject> */
    public static function for(Student $student): Builder
    {
        $department = Department::query()->where('code', $student->department_code)->value('id');
        $year = self::yearOf($student);

        return Subject::query()
            ->whereIn('course_id', Course::query()->where('department_id', $department ?? 0)->select('id'))
            ->when($year !== null, fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->whereNull('semester_number')
                ->orWhereIn('semester_number', [$year * 2 - 1, $year * 2])));
    }

    public static function takes(Student $student, Subject $subject): bool
    {
        return self::for($student)->whereKey($subject->id)->exists();
    }

    /** Faculty allocated to the subject (any semester), or admins. */
    public static function teaches(User $user, Subject $subject): bool
    {
        return $user->isAdmin()
            || SubjectAllocation::query()->where('subject_id', $subject->id)->where('faculty_id', $user->id)->exists();
    }

    /** "4th Year", "year_4" and "4" all mean 4. */
    public static function yearOf(Student $student): ?int
    {
        return preg_match('/\d+/', (string) $student->year, $match) ? (int) $match[0] : null;
    }
}
