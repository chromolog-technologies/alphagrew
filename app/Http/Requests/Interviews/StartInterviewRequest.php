<?php

namespace App\Http\Requests\Interviews;

/**
 * POST /interviews/{interview}/start — explicit consent to recording and AI evaluation is required.
 */
class StartInterviewRequest extends OwnInterviewRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return ['consentAccepted' => ['accepted']];
    }
}
