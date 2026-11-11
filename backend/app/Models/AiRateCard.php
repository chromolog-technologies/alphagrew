<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Configurable AI service rate card and credit conversion rule (SRS §5.9).
 */
class AiRateCard extends Model
{
    public const DEFAULT_SERVICES = [
        'resume_parse',
        'resume_analysis',
        'interview_plan',
        'interview_turn',
        'interview_turn_analysis',
        'interview_evaluation',
    ];

    protected $fillable = [
        'service_key',
        'provider',
        'model',
        'credits_per_request',
        'credits_per_1k_tokens',
        'usd_per_1k_input_tokens',
        'usd_per_1k_output_tokens',
        'rate_limit_per_minute',
        'warning_threshold_percent',
        'charge_on_failure',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'credits_per_request' => 'float',
            'credits_per_1k_tokens' => 'float',
            'usd_per_1k_input_tokens' => 'float',
            'usd_per_1k_output_tokens' => 'float',
            'rate_limit_per_minute' => 'integer',
            'warning_threshold_percent' => 'integer',
            'charge_on_failure' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function creditsForCall(int $totalTokens): float
    {
        return round(
            max(0.0, (float) $this->credits_per_request + ($totalTokens / 1000) * (float) $this->credits_per_1k_tokens),
            2
        );
    }
}

