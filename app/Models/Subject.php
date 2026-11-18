<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'course_id',
        'semester_number',
        'credit_hours',
        'lecture_hours',
        'practical_hours',
        'subject_type',
        'is_mandatory',
        'is_active',
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Semesters the subject has a mark scheme in (mark_schemes is unique per subject and
     * semester). Publishing readiness counts these as the semester's subjects.
     */
    public function semesters(): BelongsToMany
    {
        return $this->belongsToMany(Semester::class, 'mark_schemes', 'subject_id', 'semester_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** Credit weight in SGPA / CGPA; at least 1 so a subject is never weightless. */
    public function credits(): int
    {
        return max(1, (int) $this->credit_hours);
    }

    /** The department offering the subject, through its course. */
    public function department(): HasOneThrough
    {
        return $this->hasOneThrough(Department::class, Course::class, 'id', 'id', 'course_id', 'department_id');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }

    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function timetables(): HasMany
    {
        return $this->hasMany(Timetable::class);
    }
}
