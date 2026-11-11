<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Two-stage refund request/approval/execution record (SRS §5.8 FR-BL-005).
 */
class Refund extends Model
{
    public const STATUSES = ['requested', 'approved', 'rejected', 'executed'];

    protected $fillable = [
        'payment_id',
        'invoice_id',
        'institution_id',
        'amount',
        'currency',
        'reason',
        'status',
        'gateway_refund_reference',
        'requested_by',
        'approved_by',
        'executed_by',
        'approved_at',
        'executed_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'approved_at' => 'datetime',
            'executed_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}

