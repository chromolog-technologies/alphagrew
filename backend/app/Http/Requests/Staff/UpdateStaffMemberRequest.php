<?php

namespace App\Http\Requests\Staff;

use App\DTOs\StaffMemberData;
use App\Models\CustomFieldDefinition;
use App\Models\User;
use App\Services\CustomFields\CustomFieldService;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffMemberRequest extends FormRequest
{
    public function authorize(): Response
    {
        if (! $this->user()->isAdmin()) {
            return Response::deny('Only admins can manage staff accounts.');
        }

        // Only staff and placement-officer accounts are managed here.
        abort_unless($this->staffMember()->isInstitutionStaff(), 404);

        return Response::allow();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $staffId = $this->staffMember()->id;

        return [
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staffId)],
            'password' => ['nullable', 'string', 'min:6'],
            'biometricId' => ['nullable', 'string', 'max:255', Rule::unique('users', 'biometric_id')->ignore($staffId)],
            ...StoreStaffMemberRequest::profileRules(),
            ...app(CustomFieldService::class)->rules(CustomFieldDefinition::ENTITY_STAFF),
        ];
    }

    public function staffMember(): User
    {
        /** @var User $staff */
        $staff = $this->route('staff');

        return $staff;
    }

    /** Readable names for custom field errors. */
    public function attributes(): array
    {
        return app(CustomFieldService::class)->attributes(CustomFieldDefinition::ENTITY_STAFF);
    }

    /** @return array<string, mixed> */
    public function customFields(): array
    {
        return $this->validated('customFields') ?? [];
    }

    public function toData(): StaffMemberData
    {
        return StaffMemberData::fromValidated($this->validated(), $this->file('image'));
    }
}
