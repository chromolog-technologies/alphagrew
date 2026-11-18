<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Exam extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'subject_id',
        'exam_type_id',
        'semester_id',
        'exam_date',
        'start_time',
        'end_time',
        'duration_minutes',
        'location',
        'max_marks',
        'exam_mode',
        'status',
    ];

    protected $casts = [
        'exam_date' => 'datetime',
        'start_time' => 'time',
        'end_time' => 'time',
    ];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function examType(): BelongsTo
    {
        return $this->belongsTo(ExamType::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function marks(): HasMany
    {
        return $this->hasMany(Mark::class);
    }
}
