<?php

namespace App\Http\Resources;

use App\Models\AiInterviewTurn;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One interview turn. The per-turn quick signal is only shown once the interview is over,
 * so it never coaches the candidate mid-session.
 *
 * @mixin AiInterviewTurn
 */
class TurnResource extends JsonResource
{
    public function __construct(AiInterviewTurn $turn, private readonly bool $withSignal = false)
    {
        parent::__construct($turn);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sequence' => $this->sequence,
            'kind' => $this->kind->value,
            'competency' => $this->competency,
            'difficulty' => $this->difficulty,
            'questionText' => $this->question_text,
            'questionAudioUrl' => $this->question_audio_url,
            'askedAt' => $this->asked_at?->toIso8601String(),
            'answerText' => $this->answer_text,
            'answeredAt' => $this->answered_at?->toIso8601String(),
            'answerDurationSeconds' => $this->answer_duration_seconds,
            'quickSignal' => $this->when($this->withSignal, fn () => $this->quick_signal),
        ];
    }
}
