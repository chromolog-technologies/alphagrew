<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Audit trail of semester result publishing and unlocking. Append-only.
 */
class ResultPublishingLog extends Model
{
    use BelongsToInstitution;

    public const ACTION_PUBLISHED = 'published';

    public const ACTION_UNLOCKED = 'unlocked';

    protected $fillable = [
        'semester_id',
        'published_by',
        'action',
        'total_students',
        'students_published',
        'entries_count',
        'ip_address',
        'reason',
        'details',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'total_students' => 'integer',
            'entries_count' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }
}
