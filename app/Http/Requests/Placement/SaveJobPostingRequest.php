<?php

namespace App\Http\Requests\Placement;

use App\Models\JobPosting;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Create (POST) or update (PATCH) a job with its company and eligibility rules. */
class SaveJobPostingRequest extends FormRequest
{
    use EligibilityRuleRules;

    public function authorize(): bool
    {
        return true; // route permission middleware
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'companyId' => ['nullable', 'integer', 'required_without:companyName', TenantRule::exists('companies', 'id')->whereNull('deleted_at')],
            'companyName' => ['nullable', 'string', 'max:255', 'required_without:companyId'],
            'industry' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url:https,http', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'employmentType' => ['required', Rule::in(JobPosting::EMPLOYMENT_TYPES)],
            'location' => ['nullable', 'string', 'max:255'],
            'ctcMinLpa' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'ctcMaxLpa' => ['nullable', 'numeric', 'min:0', 'max:1000', 'gte:ctcMinLpa'],
            'stipendMonthly' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'openings' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'requiredSkills' => ['nullable', 'array', 'max:30'],
            'requiredSkills.*' => ['string', 'max:60', 'distinct'],
            'applyDeadline' => ['nullable', 'date'],
            'driveDate' => ['nullable', 'date'],
            ...$this->eligibilityRules(),
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [fn (Validator $validator) => $this->validateEligibilityValues($validator)];
    }

    /** @return array<string, mixed> */
    public function jobData(): array
    {
        $data = $this->validated();

        if ($this->has('eligibility')) {
            $data['eligibility'] = $this->normalisedRules();
        }

        return $data;
    }
}
