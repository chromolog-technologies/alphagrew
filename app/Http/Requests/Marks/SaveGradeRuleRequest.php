<?php

namespace App\Http\Requests\Marks;

use App\Models\GradeRule;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * POST /grade-rules and PUT /grade-rules/{gradeRule}. Score bands may not overlap;
 * the Absent rule (Ab) is not a score band.
 */
class SaveGradeRuleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'grade' => ['required', 'string', 'max:5', TenantRule::unique('grade_rules', 'grade')->ignore($this->gradeRule()?->id)->withoutTrashed()],
            'gradePoint' => ['required', 'numeric', 'min:0', 'max:10'],
            'minScore' => ['required', 'numeric', 'min:0', 'max:100'],
            'maxScore' => ['required', 'numeric', 'min:0', 'max:100', 'gte:minScore'],
            'isPass' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:100'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || $this->input('grade') === GradeRule::ABSENT) {
                    return;
                }

                $overlapping = GradeRule::query()
                    ->where('grade', '!=', GradeRule::ABSENT)
                    ->when($this->gradeRule(), fn ($query, GradeRule $rule) => $query->whereKeyNot($rule->id))
                    ->where('min_score', '<=', $this->input('maxScore'))
                    ->where('max_score', '>=', $this->input('minScore'))
                    ->value('grade');

                if ($overlapping !== null) {
                    $validator->errors()->add('minScore', "This score range overlaps grade {$overlapping}.");
                }
            },
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        return [
            'grade' => $this->validated('grade'),
            'grade_point' => $this->validated('gradePoint'),
            'min_score' => $this->validated('minScore'),
            'max_score' => $this->validated('maxScore'),
            'is_pass' => $this->boolean('isPass'),
            'description' => $this->validated('description'),
            'sort_order' => $this->validated('sortOrder') ?? 0,
        ];
    }

    private function gradeRule(): ?GradeRule
    {
        return $this->route('gradeRule');
    }
}
