<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Audit row for every LLM call (spec §6): who, which feature and model, tokens, latency, cost.
 * Written with an explicit institution_id (calls also run in queued jobs), so no tenant scope.
 */
class AiUsageLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'institution_id',
        'user_id',
        'feature',
        'provider',
        'model',
        'status',
        'subject_type',
        'subject_id',
        'prompt_tokens',
        'completion_tokens',
        'latency_ms',
        'estimated_cost_usd',
        'error',
    ];

    protected function casts(): array
    {
        return ['estimated_cost_usd' => 'float'];
    }
}
