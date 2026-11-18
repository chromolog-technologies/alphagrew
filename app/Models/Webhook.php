<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Outbound webhook endpoint configuration (SRS §5.21).
 */
class Webhook extends Model
{
    protected $fillable = [
        'institution_id',
        'name',
        'url',
        'events',
        'secret_masked',
        'encrypted_secret',
        'is_active',
        'last_delivery_at',
        'last_status_code',
    ];

    protected $hidden = ['encrypted_secret'];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
            'last_delivery_at' => 'datetime',
            'last_status_code' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class)->latest('delivered_at')->latest('id');
    }
}

