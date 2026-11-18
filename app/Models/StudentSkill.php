<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentSkill extends Model
{
    use BelongsToInstitution;

    public const SOURCE_SELF = 'self';

    public const SOURCE_RESUME = 'resume';

    public const SOURCE_ASSESSMENT = 'assessment';

    protected $table = 'student_skills';

    protected $fillable = [
        'student_id',
        'skill_id',
        'level',
        'source',
        'verified_level',
        'last_evidence_at',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'verified_level' => 'integer',
            'last_evidence_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    /**
     * The level matching should trust: assessment-verified first, then the stated level.
     */
    public function trustedLevel(): int
    {
        return $this->verified_level ?? $this->level;
    }
}
