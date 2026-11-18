<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An admission cohort, e.g. "CSE 2023–2027". Placement eligibility rules target batches.
 */
class Batch extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const STATUSES = ['active', 'graduated', 'archived'];

    protected $fillable = [
        'name',
        'code',
        'department_code',
        'course_id',
        'admission_year',
        'graduation_year',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'admission_year' => 'integer',
            'graduation_year' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }
}
