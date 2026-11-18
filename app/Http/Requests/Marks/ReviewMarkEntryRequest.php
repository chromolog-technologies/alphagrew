<?php

namespace App\Http\Requests\Marks;

use App\Models\MarkEntry;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

/**
 * POST /mark-review/{markEntry}/approve; base for verify and reject.
 * Reviewers are limited to their department unless they coordinate exams (SubjectPolicy).
 */
class ReviewMarkEntryRequest extends MarksStaffRequest
{
    public function authorize(): Response
    {
        $response = parent::authorize();

        return $response->denied() ? $response : Gate::inspect('reviewMarks', $this->markEntry()->subject);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    public function markEntry(): MarkEntry
    {
        return $this->route('markEntry');
    }
}
