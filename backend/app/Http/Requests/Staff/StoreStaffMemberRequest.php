<?php

namespace App\Http\Requests\Staff;

use App\DTOs\StaffMemberData;
use App\Enums\UserRole;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class StoreStaffMemberRequest extends FormRequest
{
    public function authorize(): Response
    {
        return $this->user()->isAdmin()
            ? Response::allow()
            : Response::deny('Only admins can manage staff accounts.');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:6'],
            'biometricId' => ['nullable', 'string', 'max:255', Rule::unique('users', 'biometric_id')],
            ...self::profileRules(),
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
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', Rule::in([UserRole::Staff->value, UserRole::PlacementOfficer->value])],
            'designationId' => ['required', TenantRule::exists('designations', 'id')],
            'departmentCode' => ['required', 'string', 'max:20', TenantRule::exists('departments', 'code')],
            'phone' => ['nullable', 'string', 'max:30'],
            'communicationAddress' => ['nullable', 'string'],
            'permanentAddress' => ['nullable', 'string'],
            'emergencyContactPerson' => ['nullable', 'string', 'max:255'],
            'emergencyContactNumber' => ['nullable', 'string', 'max:30'],
            'experienceYears' => ['nullable', 'integer', 'min:0'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    public function toData(): StaffMemberData
    {
        return StaffMemberData::fromValidated($this->validated(), $this->file('image'));
    }
}
