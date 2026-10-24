<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demonstrated skills against the target role's competency model (spec §5.2).
 * skill_breakdown: [{ skill, expectedLevel, demonstratedLevel, status, evidence, remediation? }].
 */
class SkillGapReport extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'student_id',
        'interview_id',
        'target_role',
        'overall_match_percentage',
        'skill_breakdown',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'overall_match_percentage' => 'float',
            'skill_breakdown' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(AiInterview::class, 'interview_id');
    }
}
