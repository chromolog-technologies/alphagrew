<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Configured third-party integration with encrypted secret & masked metadata (SRS §5.21).
 */
class Integration extends Model
{
    public const CATEGORIES = ['ai', 'speech', 'email', 'sms', 'payment', 'storage', 'webhook'];

    public const STATUSES = ['active', 'inactive', 'error'];

    protected $fillable = [
        'key',
        'name',
        'category',
        'provider',
        'status',
        'config_masked',
        'secret_configured',
        'encrypted_secret',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
        'updated_by',
    ];

    protected $hidden = ['encrypted_secret'];

    protected function casts(): array
    {
        return [
            'config_masked' => 'array',
            'secret_configured' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

