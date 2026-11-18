<?php

namespace App\Http\Requests\Marks;

/**
 * POST /mark-entries/submit — the faculty declares the class's marks complete and correct.
 */
class SubmitMarksRequest extends MarkRosterRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'declarationConfirmed' => ['accepted'],
        ];
    }
}
