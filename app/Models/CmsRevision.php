<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable revision snapshot stored whenever a CmsPage is created or edited (SRS §5.24 FR-CM-004).
 */
class CmsRevision extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'cms_page_id',
        'version_number',
        'title',
        'body',
        'editor_id',
        'change_note',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(CmsPage::class, 'cms_page_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'editor_id');
    }
}

