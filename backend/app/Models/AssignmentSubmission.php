<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A student's answer to an assignment (text and/or a file), and its grade. */
class AssignmentSubmission extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'assignment_id', 'student_id', 'text_answer', 'file_path', 'original_name', 'mime_type', 'size_bytes',
        'submitted_at', 'is_late', 'marks', 'feedback', 'graded_by', 'graded_at',
    ];

    protected $casts = ['submitted_at' => 'datetime', 'graded_at' => 'datetime', 'is_late' => 'boolean', 'marks' => 'float'];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
