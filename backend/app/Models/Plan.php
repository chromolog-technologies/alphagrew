<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Subscription plan catalog entry (SRS §5.6). Pricing and entitlements live on
 * immutable PlanVersion rows so existing subscriptions keep agreed terms.
 */
class Plan extends Model
{
    public const STATUSES = ['draft', 'active', 'archived'];

    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
        'sort_order',
        'is_public',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_public' => 'boolean',
        ];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PlanVersion::class)->orderByDesc('version_number');
    }

    public function currentVersion(): HasOne
    {
        return $this->hasOne(PlanVersion::class)->where('is_current', true)->latestOfMany('version_number');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}

