<?php

namespace App\Http\Resources;

use App\Models\AiResumeAnalysis;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiResumeAnalysis
 */
class ResumeAnalysisResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'resumeId' => $this->resume_id,
            'overallScore' => $this->overall_score,
            'atsCompatibilityScore' => $this->ats_compatibility_score,
            'sectionScores' => $this->section_scores,
            'strengths' => $this->strengths,
            'improvements' => $this->improvements,
            'extractedSkills' => $this->extracted_skills,
            'modelVersion' => $this->model_version,
            'analyzedAt' => $this->updated_at?->toIso8601String(),
            'note' => 'These scores are guidance for improving your resume, not a pass/fail judgement.',
        ];
    }
}
