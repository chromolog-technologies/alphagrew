<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Course extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'course_type',
        'stream',
        'mode',
        'academic_level',
        'duration_value',
        'duration_type',
        'total_semesters',
        'total_credits',
        'description',
        'department_id',
        'intake_capacity',
        'eligibility',
        'min_qualification',
        'entrance_required',
        'course_coordinator_id',
        'total_fees',
        'fees_per_semester',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'entrance_required' => 'boolean',
        'total_fees' => 'decimal:2',
        'fees_per_semester' => 'decimal:2',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(\App\Models\ClassModel::class);
    }
}
