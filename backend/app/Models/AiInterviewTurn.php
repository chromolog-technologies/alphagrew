<?php

namespace App\Models;

use App\Enums\TurnKind;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One question (or follow-up) and the student's answer. quick_signal is the fast per-turn
 * analysis: { relevance, technicalScore, clarity, score, depth, isVague, saysDontKnow, claim, summary }.
 */
class AiInterviewTurn extends Model
{
    use BelongsToInstitution;

    public $timestamps = false;

    protected $fillable = [
        'interview_id',
        'sequence',
        'kind',
        'competency',
        'difficulty',
        'question_text',
        'question_audio_url',
        'answer_text',
        'answer_audio_path',
        'answer_duration_seconds',
        'quick_signal',
        'asked_at',
        'answered_at',
    ];

    protected function casts(): array
    {
        return [
            'kind' => TurnKind::class,
            'sequence' => 'integer',
            'difficulty' => 'integer',
            'answer_duration_seconds' => 'integer',
            'quick_signal' => 'array',
            'asked_at' => 'datetime',
            'answered_at' => 'datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(AiInterview::class, 'interview_id');
    }

    public function isAnswered(): bool
    {
        return $this->answered_at !== null;
    }
}
