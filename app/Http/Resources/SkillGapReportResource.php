<?php

namespace App\Http\Resources;

use App\Models\SkillGapReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SkillGapReport
 */
class SkillGapReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'interviewId' => $this->interview_id,
            'targetRole' => $this->target_role,
            'overallMatchPercentage' => $this->overall_match_percentage,
            'competencies' => $this->skill_breakdown,
            'generatedAt' => $this->generated_at?->toIso8601String(),
        ];
    }
}
