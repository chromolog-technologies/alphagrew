<?php

namespace App\Http\Requests\Students;

use App\DTOs\StudentData;
use App\Models\Student;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('manage', $this->student());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $student = $this->student();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                TenantRule::unique('students', 'email')->ignore($student->id),
                $student->user
                    ? Rule::unique('users', 'email')->ignore($student->user->id)
                    : Rule::unique('users', 'email'),
            ],
            ...StoreStudentRequest::profileRules(),
            'password' => ['nullable', 'string', 'min:6'],
        ];
    }

    public function student(): Student
    {
        /** @var Student $student */
        $student = $this->route('student');
        $student->loadMissing('user');

        return $student;
    }

    public function toData(): StudentData
    {
        return StudentData::fromValidated($this->validated());
    }
}
