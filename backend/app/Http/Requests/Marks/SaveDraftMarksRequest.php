<?php

namespace App\Http\Requests\Marks;

use App\Support\Tenancy\TenantRule;
use Illuminate\Validation\Validator;

/**
 * POST /mark-entries/save-draft — bulk create / update a class's draft marks.
 */
class SaveDraftMarksRequest extends MarkRosterRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'entries' => ['required', 'array', 'min:1', 'max:500'],
            'entries.*.studentId' => ['required', 'integer', 'distinct', TenantRule::exists('students', 'id')],
            'entries.*.internalMarks' => ['nullable', 'numeric', 'min:0'],
            'entries.*.externalMarks' => ['nullable', 'numeric', 'min:0'],
            'entries.*.extraMarks' => ['nullable', 'numeric', 'min:0'],
            'entries.*.isAbsent' => ['sometimes', 'boolean'],
            'entries.*.remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                $scheme = $validator->errors()->isEmpty() ? $this->scheme() : null;

                foreach ($scheme ? $this->input('entries', []) : [] as $index => $entry) {
                    if (($entry['internalMarks'] ?? 0) > $scheme->internal_max) {
                        $validator->errors()->add("entries.{$index}.internalMarks", "Internal marks cannot exceed {$scheme->internal_max}.");
                    }
                    if (($entry['externalMarks'] ?? 0) > $scheme->external_max) {
                        $validator->errors()->add("entries.{$index}.externalMarks", "External marks cannot exceed {$scheme->external_max}.");
                    }
                }
            },
        ];
    }

    /**
     * @return list<array{studentId: int, internalMarks: ?float, externalMarks: ?float, extraMarks: ?float, isAbsent: bool, remarks: ?string}>
     */
    public function rows(): array
    {
        return collect($this->validated('entries'))->map(fn (array $entry) => [
            'studentId' => (int) $entry['studentId'],
            'internalMarks' => isset($entry['internalMarks']) ? (float) $entry['internalMarks'] : null,
            'externalMarks' => isset($entry['externalMarks']) ? (float) $entry['externalMarks'] : null,
            'extraMarks' => isset($entry['extraMarks']) ? (float) $entry['extraMarks'] : null,
            'isAbsent' => (bool) ($entry['isAbsent'] ?? false),
            'remarks' => $entry['remarks'] ?? null,
        ])->all();
    }
}
