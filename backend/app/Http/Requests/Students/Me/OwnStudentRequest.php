<?php

namespace App\Http\Requests\Students\Me;

/**
 * Reads and deletes under /students/me/... that take no input.
 */
class OwnStudentRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
