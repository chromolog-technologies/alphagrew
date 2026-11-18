<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

/**
 * A student's result for one semester, written when the semester is published
 * (PublishSemesterResultsAction). sgpa is credit-weighted; subjects_failed is the
 * semester's backlog count.
 */
class SemesterResult extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    public const STATUS_PASS = 'PASS';

    public const STATUS_FAIL = 'FAIL';

    public const STATUS_WITHHELD = 'WITHHELD';

    protected $fillable = [
        'student_id',
        'semester_id',
        'total_subjects',
        'subjects_passed',
        'subjects_failed',
        'total_marks',
        'total_possible_marks',
        'percentage',
        'overall_grade',
        'sgpa',
        'total_credits',
        'credits_earned',
        'result',
        'is_published',
        'published_at',
        'locked_at',
        'published_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'sgpa' => 'float',
            'percentage' => 'float',
            'total_marks' => 'float',
            'total_possible_marks' => 'float',
            'total_credits' => 'integer',
            'credits_earned' => 'integer',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }
}
