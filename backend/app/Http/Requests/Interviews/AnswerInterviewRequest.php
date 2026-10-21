<?php

namespace App\Http\Requests\Interviews;

/**
 * POST /interviews/{interview}/answers — the student-journey spec shape: turnId plus text.
 * The older path remains POST /interviews/{interview}/turns/{turn}/answer.
 */
class AnswerInterviewRequest extends OwnInterviewRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'turnId' => ['required', 'integer'],
            'text' => ['required_without:answerText', 'nullable', 'string', 'max:5000'],
            'answerText' => ['required_without:text', 'nullable', 'string', 'max:5000'],
        ];
    }

    public function answerText(): string
    {
        $validated = $this->validated();

        return (string) ($validated['text'] ?? $validated['answerText'] ?? '');
    }
}
