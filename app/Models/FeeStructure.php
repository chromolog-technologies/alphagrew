<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Fees of one course semester in one academic year. Assigning it to students creates their
 * StudentFee dues.
 */
class FeeStructure extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const COMPONENTS = ['tuition_fee', 'lab_fee', 'library_fee', 'exam_fee', 'other_fee'];

    protected $fillable = [
        'academic_year_id', 'course_id', 'semester', 'tuition_fee', 'lab_fee', 'library_fee', 'exam_fee', 'other_fee',
        'total_fee', 'due_date', 'remarks',
    ];

    protected $casts = [
        'semester' => 'integer',
        'tuition_fee' => 'float',
        'lab_fee' => 'float',
        'library_fee' => 'float',
        'exam_fee' => 'float',
        'other_fee' => 'float',
        'total_fee' => 'float',
        'due_date' => 'date',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function studentFees(): HasMany
    {
        return $this->hasMany(StudentFee::class);
    }
}
