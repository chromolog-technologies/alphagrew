<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class MarkEntry extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

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
        'result',
        'status',
        'remarks',
        'entered_by',
        'verified_by',
        'verified_at',
        'published_at',
    ];

    protected $casts = [
        'is_absent' => 'boolean',
        'verified_at' => 'datetime',
        'published_at' => 'datetime',
    ];

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

    /**
     * Calculate total marks and grade based on scheme
     */
    public function calculateTotalAndGrade(): void
    {
        if ($this->is_absent) {
            $this->total_marks = 0;
            $this->grade = 'AB'; // Absent
            $this->result = 'FAIL';
            return;
        }

        $total = 0;
        if ($this->internal_marks !== null) {
            $total += $this->internal_marks;
        }
        if ($this->external_marks !== null) {
            $total += $this->external_marks;
        }
        if ($this->extra_marks !== null) {
            $total += $this->extra_marks;
        }

        $this->total_marks = $total;

        // Determine grade from grade rules
        $this->grade = GradeRule::getGradeForScore($total) ?? 'F';

        // Determine result based on pass mark
        $passMarks = $this->markScheme->pass_mark ?? 40;
        $this->result = $total >= $passMarks ? 'PASS' : 'FAIL';
    }

    /**
     * Check if marks are locked (published and not overridable)
     */
    public function isLocked(): bool
    {
        return $this->status === 'locked' && $this->published_at !== null;
    }

    /**
     * Can admin override this mark?
     */
    public function canAdminOverride(): bool
    {
        return $this->status === 'locked';
    }
}
