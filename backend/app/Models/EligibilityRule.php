<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One deterministic condition a student must meet to apply, e.g. cgpa gte 7.0 or
 * department in ["CSE","IT"]. Evaluated by App\Services\Placement\EligibilityEvaluator.
 */
class EligibilityRule extends Model
{
    use BelongsToInstitution;

    /** field => allowed operators */
    public const FIELDS = [
        'cgpa' => ['gte', 'lte'],
        'active_backlogs' => ['lte', 'eq'],
        'backlog_history' => ['lte', 'eq'],
        'attendance_percentage' => ['gte'],
        'department' => ['in', 'not_in'],
        'year' => ['in', 'not_in'],
        'class_10_score' => ['gte'],
        'class_12_score' => ['gte'],
        'skill' => ['gte'], // value: { "skillId": 12, "minLevel": 3 }
    ];

    protected $fillable = [
        'job_posting_id',
        'field',
        'operator',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }
}
