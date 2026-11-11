<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cross-tenant platform broadcast announcement with delivery tracking (SRS §5.18).
 */
class PlatformAnnouncement extends Model
{
    public const CATEGORIES = ['general', 'maintenance', 'release', 'billing', 'security'];

    public const PRIORITIES = ['low', 'normal', 'high', 'critical'];

    public const CHANNELS = ['in_app', 'email', 'sms', 'push'];

    public const TARGET_SCOPES = ['all', 'institutions', 'roles'];

    public const STATUSES = ['draft', 'scheduled', 'published', 'archived'];

    protected $fillable = [
        'title',
        'body',
        'category',
        'priority',
        'channels',
        'target_scope',
        'target_institution_ids',
        'target_roles',
        'status',
        'scheduled_at',
        'published_at',
        'delivered_count',
        'failed_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'target_institution_ids' => 'array',
            'target_roles' => 'array',
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'delivered_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

