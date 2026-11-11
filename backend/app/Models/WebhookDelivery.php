<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Delivery execution log for an outbound Webhook (SRS §5.21).
 */
class WebhookDelivery extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'webhook_id',
        'event',
        'response_status',
        'success',
        'duration_ms',
        'error_message',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'response_status' => 'integer',
            'success' => 'boolean',
            'duration_ms' => 'integer',
            'delivered_at' => 'datetime',
        ];
    }

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
}

