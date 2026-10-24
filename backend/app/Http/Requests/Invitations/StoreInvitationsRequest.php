<?php

namespace App\Http\Requests\Invitations;

use App\Enums\UserRole;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Bulk invitation: up to 200 addresses, all with the same role, department and
 * (for staff and placement officers) designation.
 */
class StoreInvitationsRequest extends FormRequest
{
    public const INVITABLE_ROLES = [
        UserRole::Student->value,
        UserRole::Staff->value,
        UserRole::PlacementOfficer->value,
    ];

    public function authorize(): bool
    {
        // Invitations belong to one institution; a platform account has none.
        return $this->user()?->institution_id !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'emails' => collect((array) $this->input('emails', []))
                ->map(fn ($email): string => strtolower(trim((string) $email)))
                ->filter()
                ->unique()
                ->values()
                ->all(),
            'departmentCode' => $this->filled('departmentCode') ? strtoupper(trim((string) $this->input('departmentCode'))) : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $needsDesignation = in_array($this->input('role'), [UserRole::Staff->value, UserRole::PlacementOfficer->value], true);

        return [
            'emails' => ['required', 'array', 'min:1', 'max:200'],
            'emails.*' => ['required', 'email:rfc', 'max:255'],
            'role' => ['required', Rule::in(self::INVITABLE_ROLES)],
            'departmentCode' => ['required', 'string', 'max:20', TenantRule::exists('departments', 'code')],
            'designationId' => [$needsDesignation ? 'required' : 'nullable', 'integer', TenantRule::exists('designations', 'id')],
        ];
    }
}
