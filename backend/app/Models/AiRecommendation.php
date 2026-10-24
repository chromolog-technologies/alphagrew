<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A practice step for the student, derived from a skill gap report or a resume analysis
 * (spec stage 13).
 */
class AiRecommendation extends Model
{
    use BelongsToInstitution;

    public const SOURCE_SKILL_GAP = 'skill_gap_report';

    public const SOURCE_RESUME = 'resume_analysis';

    public const STATUS_OPEN = 'open';

    protected $fillable = [
        'student_id',
        'source_type',
        'source_id',
        'type',
        'title',
        'detail',
        'skill',
        'action',
        'priority',
        'status',
    ];

    protected function casts(): array
    {
        return ['action' => 'array'];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
