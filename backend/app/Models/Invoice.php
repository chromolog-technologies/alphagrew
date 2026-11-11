<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Institution invoice with immutable purchased line items (SRS §5.8).
 */
class Invoice extends Model
{
    public const STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void'];

    protected $fillable = [
        'invoice_number',
        'institution_id',
        'subscription_id',
        'tax_profile_id',
        'coupon_id',
        'status',
        'currency',
        'billing_period_start',
        'billing_period_end',
        'issued_at',
        'due_at',
        'subtotal',
        'discount_amount',
        'tax_rate_percent',
        'tax_amount',
        'total',
        'paid_amount',
        'balance',
        'gstin',
        'place_of_supply',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'billing_period_start' => 'date',
            'billing_period_end' => 'date',
            'issued_at' => 'datetime',
            'due_at' => 'date',
            'subtotal' => 'float',
            'discount_amount' => 'float',
            'tax_rate_percent' => 'float',
            'tax_amount' => 'float',
            'total' => 'float',
            'paid_amount' => 'float',
            'balance' => 'float',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function taxProfile(): BelongsTo
    {
        return $this->belongsTo(TaxProfile::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('created_at')->latest('id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class)->latest('created_at')->latest('id');
    }
}

