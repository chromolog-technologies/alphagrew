<?php

namespace App\Http\Requests\Marks;

use App\Models\Semester;

/**
 * GET /result-publishing/status and POST /result-publishing/publish.
 */
class SemesterResultsRequest extends MarksStaffRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'semesterId' => ['required', 'integer'],
        ];
    }

    public function semester(): Semester
    {
        return $this->findOrFail(Semester::class, 'semesterId');
    }
}
