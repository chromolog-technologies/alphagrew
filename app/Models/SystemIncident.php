<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Operational incidents tracked under System Health & Monitoring (SRS §5.20 FR-SYS-003).
 */
class SystemIncident extends Model
{
    public const SEVERITIES = ['low', 'medium', 'high', 'critical'];

    public const STATUSES = ['open', 'investigating', 'mitigated', 'resolved'];

    public const COMPONENTS = ['platform', 'database', 'cache', 'queue', 'ai', 'auth', 'billing', 'storage'];

    protected $fillable = [
        'title',
        'severity',
        'status',
        'component',
        'summary',
        'impact',
        'assigned_to',
        'created_by',
        'acknowledged_at',
        'resolved_at',
        'resolution_note',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

