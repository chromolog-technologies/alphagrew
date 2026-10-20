<?php

namespace App\Http\Requests\Marks;

use App\Models\Exam;
use App\Models\MarkScheme;
use App\Models\Subject;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

/**
 * A class's marks for one exam and subject, as seen by the faculty allocated to it.
 * GET /mark-entries/get-students; base for saving and submitting.
 */
class MarkRosterRequest extends MarksStaffRequest
{
    private ?Exam $exam = null;

    private ?Subject $subject = null;

    public function authorize(): Response
    {
        $response = parent::authorize();

        if ($response->denied() || ! is_numeric($this->input('examId')) || ! is_numeric($this->input('subjectId'))) {
            return $response; // missing ids are reported by validation
        }

        return Gate::inspect('enterMarks', [$this->subject(), $this->exam()]);
    }

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

    /** @return list<callable> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->exam()->subject_id !== null && (int) $this->exam()->subject_id !== $this->subject()->id) {
                    $validator->errors()->add('subjectId', 'This exam is for a different subject.');
                } elseif ($this->scheme() === null) {
                    $validator->errors()->add('subjectId', "No mark scheme is configured for {$this->subject()->code} in this exam's semester.");
                }
            },
        ];
    }

    public function exam(): Exam
    {
        return $this->exam ??= $this->findOrFail(Exam::class, 'examId');
    }

    public function subject(): Subject
    {
        return $this->subject ??= $this->findOrFail(Subject::class, 'subjectId');
    }

    public function scheme(): ?MarkScheme
    {
        return MarkScheme::query()
            ->where('subject_id', $this->subject()->id)
            ->where('semester_id', $this->exam()->semester_id)
            ->first();
    }
}
