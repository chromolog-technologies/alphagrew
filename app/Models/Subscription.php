<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Institution subscription lifecycle & effective-dated entitlement snapshot (SRS §5.7).
 */
class Subscription extends Model
{
    public const STATUSES = ['trial', 'active', 'past_due', 'paused', 'cancelled', 'expired'];

    public const EXPIRY_BEHAVIORS = ['grace_then_readonly', 'grace_then_suspend', 'immediate_suspend'];

    protected $fillable = [
        'institution_id',
        'plan_id',
        'plan_version_id',
        'status',
        'billing_cycle',
        'amount',
        'currency',
        'start_at',
        'end_at',
        'trial_start_at',
        'trial_end_at',
        'renewal_at',
        'grace_ends_at',
        'grace_days',
        'expiry_behavior',
        'auto_renew',
        'entitlement_snapshot',
        'cancel_reason',
        'cancelled_at',
        'paused_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'trial_start_at' => 'datetime',
            'trial_end_at' => 'datetime',
            'renewal_at' => 'datetime',
            'grace_ends_at' => 'datetime',
            'grace_days' => 'integer',
            'auto_renew' => 'boolean',
            'entitlement_snapshot' => 'array',
            'cancelled_at' => 'datetime',
            'paused_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function planVersion(): BelongsTo
    {
        return $this->belongsTo(PlanVersion::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(SubscriptionEvent::class)->latest('created_at')->latest('id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->latest('created_at')->latest('id');
    }

    public function monthlyRecurringValue(): float
    {
        if ($this->status !== 'active') {
            return 0.0;
        }

        return match ($this->billing_cycle) {
            'quarterly' => round($this->amount / 3, 2),
            'yearly' => round($this->amount / 12, 2),
            default => round($this->amount, 2),
        };
    }
}

