<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Audit row for every LLM call (spec §6 / Owner SRS §5.9): who, which feature and model,
 * tokens, latency, estimated provider cost and metered credits.
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
        'credits_charged',
        'rate_card_id',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'estimated_cost_usd' => 'float',
            'credits_charged' => 'float',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function rateCard(): BelongsTo
    {
        return $this->belongsTo(AiRateCard::class, 'rate_card_id');
    }
}
