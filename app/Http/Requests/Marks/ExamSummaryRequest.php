<?php

namespace App\Http\Requests\Marks;

use App\Models\Exam;
use App\Models\Subject;

/**
 * GET /mark-review/exam-summary — class statistics and grade distribution for review.
 */
class ExamSummaryRequest extends MarksStaffRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'examId' => ['required', 'integer'],
            'subjectId' => ['required', 'integer'],
        ];
    }

    public function exam(): Exam
    {
        return $this->findOrFail(Exam::class, 'examId');
    }

    public function subject(): Subject
    {
        return $this->findOrFail(Subject::class, 'subjectId');
    }
}
