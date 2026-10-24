<?php

namespace App\Http\Resources;

use App\Models\AiInterviewEvaluation;
use App\Services\Ai\InterviewEvaluator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiInterviewEvaluation
 */
class InterviewEvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'interviewId' => $this->interview_id,
            'overallScore' => $this->overall_score,
            'dimensionScores' => $this->dimension_scores,
            'dimensionWeights' => InterviewEvaluator::DIMENSIONS,
            'competencyBreakdown' => $this->competency_breakdown,
            'strengths' => $this->strengths,
            'weaknesses' => $this->weaknesses,
            'perTurnEvaluations' => $this->per_turn_evaluations,
            'recommendations' => $this->recommendations,
            'rubricVersion' => $this->rubric_version,
            'modelName' => $this->model_name,
            'evaluatedAt' => $this->evaluated_at?->toIso8601String(),
            'note' => 'Practice feedback to guide your preparation, not a hiring decision.',
        ];
    }
}
