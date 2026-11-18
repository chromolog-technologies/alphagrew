<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'max_marks' => 'integer',
        'duration_minutes' => 'integer',
    ];

    /** "HH:MM", whether the database returns "10:00" (SQLite) or "10:00:00" (MySQL TIME). */
    protected function startTime(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }

    protected function endTime(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }

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

    /** Marks entered through the results workflow (mark_entries). */
    public function markEntries(): HasMany
    {
        return $this->hasMany(MarkEntry::class);
    }
}
