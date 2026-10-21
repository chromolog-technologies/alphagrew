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
            'text' => ['required_without_all:answerText,audio', 'nullable', 'string', 'max:5000'],
            'answerText' => ['required_without_all:text,audio', 'nullable', 'string', 'max:5000'],
            'audio' => ['nullable', 'file', 'max:10240', 'mimetypes:audio/webm,video/webm,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave'],
        ];
    }

    public function answerText(): string
    {
        $validated = $this->validated();

        return (string) ($validated['text'] ?? $validated['answerText'] ?? '');
    }
}
