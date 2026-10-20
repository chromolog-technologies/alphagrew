<?php

namespace App\Http\Requests\Marks;

use App\Models\Exam;
use App\Models\Subject;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

/**
 * POST /mark-review/bulk-approve — every verified entry of a subject (optionally one exam).
 */
class BulkApproveMarksRequest extends MarksStaffRequest
{
    public function authorize(): Response
    {
        $response = parent::authorize();

        if ($response->denied() || ! is_numeric($this->input('subjectId'))) {
            return $response;
        }

        return Gate::inspect('reviewMarks', $this->subject());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'subjectId' => ['required', 'integer'],
            'examId' => ['nullable', 'integer'],
        ];
    }

    public function subject(): Subject
    {
        return $this->findOrFail(Subject::class, 'subjectId');
    }

    public function exam(): ?Exam
    {
        return $this->filled('examId') ? $this->findOrFail(Exam::class, 'examId') : null;
    }
}
