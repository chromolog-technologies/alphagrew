<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

/**
 * How a subject is marked in one semester: maximum and pass marks for the internal and
 * external components and the total. Unique per subject and semester.
 */
class MarkScheme extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $fillable = [
        'subject_id',
        'semester_id',
        'internal_max',
        'external_max',
        'total_max',
        'internal_pass',
        'external_pass',
        'total_pass',
        'extra_marks_allowed',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'internal_max' => 'float',
            'external_max' => 'float',
            'total_max' => 'float',
            'internal_pass' => 'float',
            'external_pass' => 'float',
            'total_pass' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function markEntries(): HasMany
    {
        return $this->hasMany(MarkEntry::class);
    }
}
