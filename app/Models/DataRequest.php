<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant export or deletion governance request requiring explicit approval & confirmation (SRS §5.23).
 */
class DataRequest extends Model
{
    public const TYPES = ['export', 'deletion'];

    public const STATUSES = ['pending', 'approved', 'rejected', 'completed'];

    protected $fillable = [
        'institution_id',
        'request_type',
        'status',
        'reason',
        'approval_confirmation',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

