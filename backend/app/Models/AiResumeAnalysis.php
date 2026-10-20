<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ATS-style resume feedback written by AnalyzeResumeJob. Guidance only, never a verdict.
 */
class AiResumeAnalysis extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'resume_id',
        'overall_score',
        'ats_compatibility_score',
        'section_scores',
        'strengths',
        'improvements',
        'extracted_skills',
        'model_version',
    ];

    protected function casts(): array
    {
        return [
            'overall_score' => 'integer',
            'ats_compatibility_score' => 'integer',
            'section_scores' => 'array',
            'strengths' => 'array',
            'improvements' => 'array',
            'extracted_skills' => 'array',
        ];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
