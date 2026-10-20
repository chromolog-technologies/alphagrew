<?php

namespace App\Http\Resources;

use App\Models\AiInterview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An interview session's configuration, plan and state (also used for the history list).
 *
 * @mixin AiInterview
 */
class InterviewSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mode' => $this->mode->value,
            'targetRole' => $this->target_role,
            'targetExperienceLevel' => $this->target_experience_level,
            'baseDifficulty' => $this->base_difficulty,
            'currentDifficulty' => $this->current_difficulty,
            'status' => $this->status->value,
            'timeLimitMinutes' => $this->time_limit_minutes,
            'plan' => [
                'totalTargetTurns' => $this->plan['totalTargetTurns'] ?? null,
                'competencies' => collect($this->plan['competencies'] ?? [])
                    ->map(fn (array $c) => ['name' => $c['name'], 'weight' => $c['weight'], 'plannedTurns' => $c['plannedTurns']])
                    ->all(),
            ],
            'resumeId' => $this->resume_id,
            'jobPostingId' => $this->job_posting_id,
            'endReason' => $this->end_reason,
            'consentGivenAt' => $this->consent_given_at?->toIso8601String(),
            'startedAt' => $this->started_at?->toIso8601String(),
            'endsAt' => $this->started_at?->copy()->addMinutes($this->time_limit_minutes)->toIso8601String(),
            'endedAt' => $this->ended_at?->toIso8601String(),
            'overallScore' => $this->whenLoaded('evaluation', fn () => $this->evaluation?->overall_score),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
