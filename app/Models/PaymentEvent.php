<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Deduplicated webhook / reconciliation event log (SRS §8.4 / FR-BL-004).
 */
class PaymentEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'payment_id',
        'event_id',
        'gateway',
        'event_type',
        'status',
        'payload',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}

