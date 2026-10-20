<?php

namespace App\Http\Requests\Companies;

use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

/**
 * Create and update a company drive (same fields for both).
 */
class SaveCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Module permission (placement.create) is enforced by route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'packageOffered' => ['required', 'string', 'max:100'],
            'driveDate' => ['required', 'date'],
            'status' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::COMPANY_DRIVE_STATUS))],
            'location' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::COMPANY_DRIVE_TYPE))],
            'eligibleDepartments' => ['required', 'array', 'min:1'],
            'eligibleDepartments.*' => ['string', TenantRule::exists('departments', 'code')],
        ];
    }

    /**
     * Validated input mapped to company columns.
     *
     * @return array<string, mixed>
     */
    public function companyAttributes(): array
    {
        $payload = $this->validated();

        return [
            'name' => $payload['name'],
            'role' => $payload['role'],
            'package_offered' => $payload['packageOffered'],
            'drive_date' => $payload['driveDate'],
            'status' => $payload['status'],
            'location' => $payload['location'],
            'type' => $payload['type'],
            'eligible_departments' => array_values(array_unique(array_map('strtoupper', $payload['eligibleDepartments']))),
        ];
    }
}
