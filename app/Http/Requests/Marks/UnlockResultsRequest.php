<?php

namespace App\Http\Requests\Marks;

/**
 * POST /result-publishing/unlock — the reason is kept in the publishing log.
 */
class UnlockResultsRequest extends SemesterResultsRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }
}
