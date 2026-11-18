<?php

namespace App\Repositories;

use App\Enums\UserRole;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Read access to students, with the per-role visibility rule in one place.
 */
class StudentRepository
{
    /**
     * Students visible to the user, deny by default:
     * - admins and placement officers: all students of the institution;
     * - staff: their own department only, and none while they have no department;
     * - students: only themselves;
     * - every other role (recruiters, platform staff, unknown values): none. Recruiters get
     *   their own rule when the recruiter portal is built.
     */
    public function visibleTo(User $user): Builder
    {
        $user->loadMissing('student:id,user_id,department_code');

        $query = Student::query()
            ->with(['applications', 'studentSkills.skill', 'academicSummary'])
            ->orderBy('id');

        return match (true) {
            $user->isAdmin(), $user->role === UserRole::PlacementOfficer->value => $query,
            $user->role === UserRole::Staff->value && filled($user->department_code) => $query->where('department_code', $user->department_code),
            $user->role === UserRole::Student->value && $user->student !== null => $query->whereKey($user->student->id),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public function paginateVisibleTo(User $user, int $perPage): LengthAwarePaginator
    {
        return $this->visibleTo($user)->paginate($perPage);
    }

    /**
     * Next student id, also used as the registration-number sequence.
     * Includes soft-deleted rows so numbers are never reused.
     */
    public function nextId(): int
    {
        return (int) Student::withTrashed()->max('id') + 1;
    }
}
