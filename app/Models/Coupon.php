<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Promotional discount coupon applied to generated invoices.
 */
class Coupon extends Model
{
    public const TYPES = ['percent', 'fixed'];

    protected $fillable = [
        'code',
        'name',
        'discount_type',
        'discount_value',
        'currency',
        'max_redemptions',
        'redemptions_count',
        'valid_from',
        'valid_until',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'float',
            'max_redemptions' => 'integer',
            'redemptions_count' => 'integer',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function isRedeemable(string $currency): bool
    {
        if (! $this->is_active) {
            return false;
        }
        if ($this->valid_from && now()->lt($this->valid_from)) {
            return false;
        }
        if ($this->valid_until && now()->gt($this->valid_until)) {
            return false;
        }
        if ($this->max_redemptions !== null && $this->redemptions_count >= $this->max_redemptions) {
            return false;
        }
        if ($this->discount_type === 'fixed' && $this->currency && strtoupper($this->currency) !== strtoupper($currency)) {
            return false;
        }

        return true;
    }

    public function discountCentsFor(int $subtotalCents): int
    {
        if ($subtotalCents <= 0) {
            return 0;
        }

        if ($this->discount_type === 'percent') {
            $pct = max(0, min(100, (float) $this->discount_value));

            return (int) min($subtotalCents, round($subtotalCents * ($pct / 100)));
        }

        return (int) min($subtotalCents, max(0, round((float) $this->discount_value * 100)));
    }
}

