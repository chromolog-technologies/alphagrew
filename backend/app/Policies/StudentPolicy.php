<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Student;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Record-level rules for students. Route middleware already checks the module
 * permission (students.create); this adds who may touch which student.
 * Admins pass every check through Gate::before in AppServiceProvider.
 */
class StudentPolicy
{
    /** Update or delete: staff are limited to their own department. */
    public function manage(User $user, Student $student): Response
    {
        if ($user->role === UserRole::Staff->value && $user->department_code !== $student->department_code) {
            return Response::deny('You can only manage students in your own department.');
        }

        return Response::allow();
    }
}
