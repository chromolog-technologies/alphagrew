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
     * Students visible to the user: all for admins and placement officers,
     * own department for staff, only themselves for students.
     */
    public function visibleTo(User $user): Builder
    {
        $user->loadMissing('student:id,user_id,department_code');

        return Student::query()
            ->with('applications')
            ->when(
                $user->role === UserRole::Staff->value && $user->department_code,
                fn (Builder $query) => $query->where('department_code', $user->department_code)
            )
            ->when(
                $user->role === UserRole::Student->value,
                fn (Builder $query) => $query->whereKey($user->student?->id ?? 0)
            )
            ->orderBy('id');
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
