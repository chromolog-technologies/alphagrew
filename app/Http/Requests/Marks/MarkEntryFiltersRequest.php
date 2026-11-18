<?php

namespace App\Http\Requests\Marks;

use App\Enums\MarkStatus;
use Illuminate\Validation\Rule;

/**
 * GET /mark-entries and GET /mark-review/get-submitted-marks filters.
 */
class MarkEntryFiltersRequest extends MarksStaffRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'examId' => ['nullable', 'integer'],
            'subjectId' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(MarkStatus::values())],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:200'],
        ];
    }
}
