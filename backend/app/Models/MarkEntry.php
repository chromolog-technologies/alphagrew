<?php

namespace App\Models;

use App\Enums\MarkStatus;
use App\Services\Academics\MarkGrader;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

/**
 * One student's marks in one subject for one exam, moving through the lifecycle in
 * MarkStatus. Total, grade, grade point and result are derived by MarkGrader.
 */
class MarkEntry extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    public const RESULT_PASS = 'PASS';

    public const RESULT_FAIL = 'FAIL';

    protected $fillable = [
        'exam_id',
        'student_id',
        'subject_id',
        'mark_scheme_id',
        'internal_marks',
        'external_marks',
        'extra_marks',
        'is_absent',
        'total_marks',
        'grade',
        'grade_point',
        'result',
        'status',
        'remarks',
        'entered_by',
        'submitted_at',
        'verified_by',
        'verified_at',
        'approved_by',
        'approved_at',
        'locked_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => MarkStatus::class,
            'internal_marks' => 'float',
            'external_marks' => 'float',
            'extra_marks' => 'float',
            'total_marks' => 'float',
            'grade_point' => 'float',
            'is_absent' => 'boolean',
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'approved_at' => 'datetime',
            'locked_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function markScheme(): BelongsTo
    {
        return $this->belongsTo(MarkScheme::class);
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** Entries of exams held in the given semester. */
    public function scopeInSemester(Builder $query, int $semesterId): Builder
    {
        return $query->whereHas('exam', fn (Builder $exam) => $exam->where('semester_id', $semesterId));
    }

    /** Total = internal + external + extra; then percentage, grade, grade point and verdict. */
    public function calculateTotalAndGrade(): void
    {
        app(MarkGrader::class)->apply($this);
    }

    public function failed(): bool
    {
        return $this->is_absent || $this->result === self::RESULT_FAIL;
    }
}
