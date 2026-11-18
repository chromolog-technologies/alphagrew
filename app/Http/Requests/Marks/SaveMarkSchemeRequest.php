<?php

namespace App\Http\Requests\Marks;

use App\Models\MarkScheme;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * POST /mark-schemes and PUT /mark-schemes/{markScheme}. One scheme per subject and semester;
 * total_max = internal_max + external_max; pass marks within their maximum.
 */
class SaveMarkSchemeRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'subjectId' => [
                'required', 'integer', TenantRule::exists('subjects', 'id'),
                TenantRule::unique('mark_schemes', 'subject_id')
                    ->where('semester_id', $this->input('semesterId'))
                    ->ignore($this->markScheme()?->id)
                    ->withoutTrashed(),
            ],
            'semesterId' => ['required', 'integer', TenantRule::exists('semesters', 'id')],
            'internalMax' => ['required', 'numeric', 'min:0', 'max:999'],
            'externalMax' => ['required', 'numeric', 'min:0', 'max:999'],
            'totalMax' => ['required', 'numeric', 'gt:0', 'max:999'],
            'internalPass' => ['required', 'numeric', 'min:0', 'lte:internalMax'],
            'externalPass' => ['required', 'numeric', 'min:0', 'lte:externalMax'],
            'totalPass' => ['required', 'numeric', 'min:0', 'lte:totalMax'],
            'extraMarksAllowed' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isEmpty()
                    && round((float) $this->input('internalMax') + (float) $this->input('externalMax'), 2) !== round((float) $this->input('totalMax'), 2)) {
                    $validator->errors()->add('totalMax', 'Total maximum must equal internal + external maximum.');
                }
            },
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        return [
            'subject_id' => $this->validated('subjectId'),
            'semester_id' => $this->validated('semesterId'),
            'internal_max' => $this->validated('internalMax'),
            'external_max' => $this->validated('externalMax'),
            'total_max' => $this->validated('totalMax'),
            'internal_pass' => $this->validated('internalPass'),
            'external_pass' => $this->validated('externalPass'),
            'total_pass' => $this->validated('totalPass'),
            'extra_marks_allowed' => $this->validated('extraMarksAllowed') ?? 0,
            'is_active' => $this->boolean('isActive', true),
        ];
    }

    private function markScheme(): ?MarkScheme
    {
        return $this->route('markScheme');
    }
}
