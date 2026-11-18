<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Payment record reconciled with an invoice (SRS §5.8 FR-BL-003/004).
 */
class Payment extends Model
{
    public const STATUSES = ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'];

    protected $fillable = [
        'invoice_id',
        'institution_id',
        'payment_reference',
        'gateway',
        'method',
        'amount',
        'currency',
        'status',
        'refunded_amount',
        'gateway_event_id',
        'gateway_payload_reference',
        'failure_reason',
        'paid_at',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'refunded_amount' => 'float',
            'gateway_payload_reference' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function refundableAmount(): float
    {
        return max(0.0, round($this->amount - $this->refunded_amount, 2));
    }
}

