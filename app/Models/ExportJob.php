<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable audit record of every report export (SRS §5.15 NFR-SEC-006).
 */
class ExportJob extends Model
{
    protected $fillable = [
        'report_key',
        'format',
        'filters',
        'row_count',
        'status',
        'actor_id',
        'file_name',
        'exported_at',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'row_count' => 'integer',
            'exported_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

