<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Timestamped sales activity recorded on a CRM Lead (SRS §5.17 FR-CR-003).
 */
class SalesActivity extends Model
{
    public const TYPES = ['call', 'email', 'demo', 'proposal', 'note'];

    protected $fillable = ['lead_id', 'activity_type', 'summary', 'outcome', 'occurred_at', 'actor_id'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

