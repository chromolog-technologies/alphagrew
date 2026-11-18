<?php

namespace App\Models;

use App\Enums\InterviewMode;
use App\Enums\InterviewStatus;
use App\Enums\TurnKind;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * One AI mock interview session. `plan` holds the blueprint from InterviewPlanner:
 * { totalTargetTurns, competencies: [{ name, category, weight, plannedTurns }] }.
 */
class AiInterview extends Model
{
    use BelongsToInstitution;

    protected $table = 'ai_interviews';

    protected $fillable = [
        'student_id',
        'resume_id',
        'job_posting_id',
        'mode',
        'target_role',
        'target_experience_level',
        'base_difficulty',
        'current_difficulty',
        'status',
        'time_limit_minutes',
        'plan',
        'end_reason',
        'consent_given_at',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'mode' => InterviewMode::class,
            'status' => InterviewStatus::class,
            'plan' => 'array',
            'base_difficulty' => 'integer',
            'current_difficulty' => 'integer',
            'time_limit_minutes' => 'integer',
            'consent_given_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function turns(): HasMany
    {
        return $this->hasMany(AiInterviewTurn::class, 'interview_id')->orderBy('sequence');
    }

    public function evaluation(): HasOne
    {
        return $this->hasOne(AiInterviewEvaluation::class, 'interview_id');
    }

    public function skillGapReport(): HasOne
    {
        return $this->hasOne(SkillGapReport::class, 'interview_id');
    }

    /** Planned questions asked so far (follow-ups excluded). */
    public function questionsAsked(): int
    {
        return $this->turns->where('kind', TurnKind::Question)->count();
    }

    public function timeIsUp(): bool
    {
        return $this->started_at !== null && $this->started_at->copy()->addMinutes($this->time_limit_minutes)->isPast();
    }
}
