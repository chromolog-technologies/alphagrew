<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable lifecycle history for a subscription (upgrades, renewals, pauses, cancellations).
 */
class SubscriptionEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'subscription_id',
        'institution_id',
        'event_type',
        'from_plan_version_id',
        'to_plan_version_id',
        'from_status',
        'to_status',
        'reason',
        'metadata',
        'actor_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

