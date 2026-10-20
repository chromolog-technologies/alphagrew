<?php

namespace App\Http\Requests\Interviews;

/**
 * POST /interviews/{interview}/finish — `reason` defaults to user_ended.
 */
class FinishInterviewRequest extends OwnInterviewRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return ['reason' => ['nullable', 'string', 'max:40']];
    }
}
