<?php

namespace App\Http\Requests\Auth;

use App\DTOs\StudentData;
use App\Models\Department;
use App\Models\Institution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Student self-registration. The student must name an active institution (by the code
 * the institution gave them) and an existing department.
 */
class RegisterRequest extends FormRequest
{
    private ?Institution $institution = null;

    private ?Department $department = null;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email'), Rule::unique('students', 'email')],
            'password' => ['required', 'string', 'min:6'],
            'institutionCode' => ['required', 'string', 'max:50'],
            'departmentCode' => ['required', 'string', 'max:20'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $this->institution = Institution::query()
                    ->where('code', strtoupper(trim($this->input('institutionCode'))))
                    ->first();

                if (! $this->institution?->isActive()) {
                    $validator->errors()->add(
                        'institutionCode',
                        'No active institution uses this code. Check the code your institution gave you.'
                    );

                    return;
                }

                // Registration is unauthenticated, so there is no tenant scope: filter explicitly.
                $this->department = Department::query()
                    ->where('institution_id', $this->institution->id)
                    ->where('code', strtoupper(trim($this->input('departmentCode'))))
                    ->first();

                if (! $this->department) {
                    $validator->errors()->add('departmentCode', 'This department does not exist at your institution.');
                }
            },
        ];
    }

    public function institution(): Institution
    {
        return $this->institution;
    }

    public function department(): Department
    {
        return $this->department;
    }

    public function toData(): StudentData
    {
        return StudentData::forSelfRegistration(
            $this->validated('name'),
            $this->validated('email'),
            $this->validated('password'),
            $this->department->code,
        );
    }
}
