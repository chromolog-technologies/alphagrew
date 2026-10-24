<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A faculty member teaching a subject in a semester. Only allocated faculty enter
 * that subject's marks.
 */
class SubjectAllocation extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'subject_id',
        'faculty_id',
        'semester_id',
        'allocated_from',
        'allocated_to',
    ];

    protected function casts(): array
    {
        return [
            'allocated_from' => 'date',
            'allocated_to' => 'date',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
