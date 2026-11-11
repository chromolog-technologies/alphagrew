<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Institution AI credit wallet reconciled from append-only AiCreditTransaction rows (SRS §5.9).
 */
class AiCreditWallet extends Model
{
    protected $fillable = [
        'institution_id',
        'balance',
        'allocated_total',
        'consumed_total',
        'monthly_quota',
        'warning_threshold_percent',
        'hard_stop_on_exhaustion',
        'charge_failed_requests',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'float',
            'allocated_total' => 'float',
            'consumed_total' => 'float',
            'monthly_quota' => 'float',
            'warning_threshold_percent' => 'integer',
            'hard_stop_on_exhaustion' => 'boolean',
            'charge_failed_requests' => 'boolean',
            'last_activity_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AiCreditTransaction::class, 'wallet_id')->latest('id');
    }

    public function usedPercent(): float
    {
        if ($this->allocated_total <= 0) {
            return 0.0;
        }

        return round(($this->consumed_total / $this->allocated_total) * 100, 1);
    }
}

