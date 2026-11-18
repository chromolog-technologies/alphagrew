<?php

namespace App\Http\Requests\Placement;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** Unsaved rules from the job editor, to count eligible students live. */
class EligibilityPreviewRequest extends FormRequest
{
    use EligibilityRuleRules;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['eligibility' => ['present', 'array', 'max:20'], ...array_diff_key($this->eligibilityRules(), ['eligibility' => true])];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [fn (Validator $validator) => $this->validateEligibilityValues($validator)];
    }

    /** @return list<array{field: string, operator: string, value: mixed}> */
    public function rulesToPreview(): array
    {
        return $this->normalisedRules();
    }
}
