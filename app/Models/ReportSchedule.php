<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Recurring scheduled report delivery configuration (SRS §5.15 FR-AN-005).
 */
class ReportSchedule extends Model
{
    public const FREQUENCIES = ['daily', 'weekly', 'monthly'];

    protected $fillable = [
        'name',
        'report_key',
        'filters',
        'frequency',
        'format',
        'recipients',
        'is_active',
        'next_run_at',
        'last_run_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'recipients' => 'array',
            'is_active' => 'boolean',
            'next_run_at' => 'datetime',
            'last_run_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

