<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Product release lifecycle record separating deployment status from release-note publication (SRS §5.25).
 */
class ProductRelease extends Model
{
    public const RELEASE_TYPES = ['major', 'minor', 'patch', 'hotfix'];

    public const DEPLOYMENT_STATUSES = ['planned', 'staging', 'deployed', 'rolled_back'];

    public const PUBLICATION_STATUSES = ['draft', 'published', 'archived'];

    protected $fillable = [
        'version',
        'title',
        'release_type',
        'release_date',
        'deployment_status',
        'publication_status',
        'features',
        'fixes',
        'affected_modules',
        'target_scope',
        'target_institution_ids',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
            'features' => 'array',
            'fixes' => 'array',
            'affected_modules' => 'array',
            'target_institution_ids' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

