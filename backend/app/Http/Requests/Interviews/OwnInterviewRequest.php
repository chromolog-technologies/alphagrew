<?php

namespace App\Http\Requests\Interviews;

use App\Http\Requests\Students\Me\StudentSelfRequest;
use App\Models\AiInterview;
use Illuminate\Auth\Access\Response;

/**
 * /interviews/{interview}/... — only the student who owns the interview. Another student's
 * interview is 404, like another institution's (route binding is tenant-scoped).
 */
class OwnInterviewRequest extends StudentSelfRequest
{
    public function authorize(): Response
    {
        $response = parent::authorize();

        if ($response->allowed()) {
            abort_unless($this->interview()->student_id === $this->student()->id, 404);
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    public function interview(): AiInterview
    {
        return $this->route('interview');
    }
}
