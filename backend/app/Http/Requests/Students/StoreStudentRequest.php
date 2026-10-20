<?php

namespace App\Http\Requests\Students;

use App\DTOs\StudentData;
use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Module permission (students.create) is enforced by route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', TenantRule::unique('students', 'email'), Rule::unique('users', 'email')],
            ...self::profileRules(),
            'password' => ['required', 'string', 'min:6'],
        ];
    }

    /**
     * Rules shared by create and update.
     *
     * @return array<string, mixed>
     */
    public static function profileRules(): array
    {
        return [
            'departmentCode' => ['nullable', 'string', 'max:20', TenantRule::exists('departments', 'code')],
            'year' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_YEAR))],
            'gender' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_GENDER))],
            'status' => ['nullable', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::STUDENT_STATUS))],
            'cgpa' => ['required', 'numeric', 'min:0', 'max:10'],
            'attendance' => ['required', 'integer', 'min:0', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'feeStatus' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::PAYMENT_STATUS))],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:100'],
        ];
    }

    public function toData(): StudentData
    {
        return StudentData::fromValidated($this->validated());
    }
}
