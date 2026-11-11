<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Scheduled/manual database & configuration backup record with restore drill verification (SRS §5.23).
 */
class BackupRecord extends Model
{
    public const TYPES = ['full', 'incremental', 'config'];

    public const SCOPES = ['platform', 'institution'];

    public const STATUSES = ['scheduled', 'running', 'completed', 'failed'];

    protected $fillable = [
        'backup_type',
        'scope',
        'institution_id',
        'storage_location',
        'size_mb',
        'status',
        'verified',
        'restore_tested_at',
        'restore_outcome',
        'retention_until',
        'notes',
        'triggered_by',
    ];

    protected function casts(): array
    {
        return [
            'size_mb' => 'float',
            'verified' => 'boolean',
            'restore_tested_at' => 'datetime',
            'retention_until' => 'date',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function triggerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}

