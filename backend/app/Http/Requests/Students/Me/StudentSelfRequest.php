<?php

namespace App\Http\Requests\Students\Me;

use App\Enums\UserRole;
use App\Models\Student;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Base for /students/me/... requests: only a signed-in student with a student record,
 * acting on their own data.
 */
abstract class StudentSelfRequest extends FormRequest
{
    public function authorize(): Response
    {
        $user = $this->user();

        return $user->role === UserRole::Student->value && $user->student
            ? Response::allow()
            : Response::deny('Only student accounts can manage their own profile.');
    }

    public function student(): Student
    {
        return $this->user()->student;
    }

    /**
     * 404 unless the route-bound record belongs to the signed-in student.
     */
    public function ownRecord(string $parameter): Model
    {
        /** @var Model $record */
        $record = $this->route($parameter);

        abort_unless($record->getAttribute('student_id') === $this->student()->id, 404);

        return $record;
    }
}
