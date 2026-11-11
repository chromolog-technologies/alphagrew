<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Platform CMS content entry: pages, FAQs, policies, release notes (SRS §5.24).
 */
class CmsPage extends Model
{
    public const TYPES = ['page', 'faq', 'policy', 'release_note'];

    public const STATUSES = ['draft', 'review', 'published', 'scheduled', 'archived'];

    protected $fillable = [
        'content_type',
        'slug',
        'title',
        'summary',
        'body',
        'seo_title',
        'seo_description',
        'status',
        'scheduled_at',
        'published_at',
        'current_version',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'current_version' => 'integer',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(CmsRevision::class)->orderByDesc('version_number');
    }
}

