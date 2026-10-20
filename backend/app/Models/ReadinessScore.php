<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One point in a student's readiness history (spec §5.3). A coaching indicator, never an
 * employability verdict. Components not measured yet have score null and are left out of
 * the overall rather than counted as 0.
 */
class ReadinessScore extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'student_id',
        'overall',
        'components',
        'trigger',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'overall' => 'float',
            'components' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
