<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Mark extends Model
{
    use BelongsToInstitution, LogsActivity, SoftDeletes;

    protected $fillable = [
        'exam_id',
        'student_id',
        'subject_id',
        'marks_obtained',
        'total_marks',
        'percentage',
        'grade',
        'remarks',
        'feedback',
        'status',
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

    public function getGradeAttribute($value)
    {
        if ($this->marks_obtained === null) {
            return null;
        }

        $marks = $this->marks_obtained;

        return match (true) {
            $marks >= 90 => 'A+',
            $marks >= 80 => 'A',
            $marks >= 70 => 'B+',
            $marks >= 60 => 'B',
            $marks >= 50 => 'C',
            default => 'F'
        };
    }
}
