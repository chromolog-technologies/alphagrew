<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Saved Owner Analytics & Reporting configurations (SRS §5.15 / §13).
 */
class SavedReport extends Model
{
    protected $fillable = ['name', 'report_key', 'filters', 'format', 'created_by', 'last_run_at'];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'last_run_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

