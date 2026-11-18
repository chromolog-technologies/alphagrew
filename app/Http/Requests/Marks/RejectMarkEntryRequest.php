<?php

namespace App\Http\Requests\Marks;

/**
 * POST /mark-review/{markEntry}/reject — back to draft; remarks tell the faculty what to fix.
 */
class RejectMarkEntryRequest extends ReviewMarkEntryRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remarks' => ['required', 'string', 'max:1000'],
        ];
    }
}
