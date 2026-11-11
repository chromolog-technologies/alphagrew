<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * High-severity security alerts surfaced in Owner Audit & Security (SRS FR-SEC-003).
 */
class SecurityEvent extends Model
{
    public const SEVERITIES = ['info', 'warning', 'high', 'critical'];

    public const STATUSES = ['open', 'acknowledged', 'resolved'];

    protected $fillable = [
        'severity',
        'event_type',
        'institution_id',
        'user_id',
        'email',
        'ip_address',
        'user_agent',
        'summary',
        'metadata',
        'status',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}

