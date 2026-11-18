<?php

namespace App\Http\Requests\Interviews;

use App\Models\AiInterviewTurn;

/**
 * POST /interviews/{interview}/turns/{turn}/answer — `answerText`, or a multipart `audio`
 * recording (WebM / WAV, ≤ 10 MB) that is transcribed.
 */
class AnswerTurnRequest extends OwnInterviewRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'answerText' => ['required_without:audio', 'nullable', 'string', 'max:5000'],
            'audio' => ['nullable', 'file', 'max:10240', 'mimetypes:audio/webm,video/webm,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave'],
        ];
    }

    public function turn(): AiInterviewTurn
    {
        return $this->route('turn');
    }
}
