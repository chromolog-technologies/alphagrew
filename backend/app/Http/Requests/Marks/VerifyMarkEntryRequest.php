<?php

namespace App\Http\Requests\Marks;

/**
 * POST /mark-review/{markEntry}/verify, with optional moderation adjustments.
 */
class VerifyMarkEntryRequest extends ReviewMarkEntryRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remarks' => ['nullable', 'string', 'max:1000'],
            'adjustments' => ['nullable', 'array:internal_marks,external_marks,extra_marks'],
            'adjustments.internal_marks' => ['nullable', 'numeric', 'min:0'],
            'adjustments.external_marks' => ['nullable', 'numeric', 'min:0'],
            'adjustments.extra_marks' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /** @return array{internal_marks?: float|null, external_marks?: float|null, extra_marks?: float|null} */
    public function adjustments(): array
    {
        return array_map(fn ($value) => $value === null ? null : (float) $value, $this->validated('adjustments') ?? []);
    }
}
