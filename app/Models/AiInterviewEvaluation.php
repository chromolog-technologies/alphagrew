<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The final multi-dimensional scorecard of an interview (spec §5.1).
 */
class AiInterviewEvaluation extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'interview_id',
        'overall_score',
        'dimension_scores',
        'competency_breakdown',
        'strengths',
        'weaknesses',
        'per_turn_evaluations',
        'recommendations',
        'rubric_version',
        'model_name',
        'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'overall_score' => 'integer',
            'dimension_scores' => 'array',
            'competency_breakdown' => 'array',
            'strengths' => 'array',
            'weaknesses' => 'array',
            'per_turn_evaluations' => 'array',
            'recommendations' => 'array',
            'evaluated_at' => 'datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(AiInterview::class, 'interview_id');
    }
}
