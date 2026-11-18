<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's current-programme figures used by placement eligibility.
 * Derived from published results (source = results); until a result is published
 * it holds the hand-entered values (source = manual). Never edited directly.
 */
class StudentAcademicSummary extends Model
{
    use BelongsToInstitution;

    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_RESULTS = 'results';

    protected $fillable = [
        'student_id',
        'cgpa',
        'active_backlogs',
        'backlog_history',
        'attendance_percentage',
        'subjects_published',
        'semesters_published',
        'source',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'cgpa' => 'float',
            'active_backlogs' => 'integer',
            'backlog_history' => 'integer',
            'attendance_percentage' => 'float',
            'subjects_published' => 'integer',
            'semesters_published' => 'integer',
            'calculated_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function isDerived(): bool
    {
        return $this->source === self::SOURCE_RESULTS;
    }
}
