<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Checklist step within an Institution Onboarding Request (SRS §5.3).
 */
class OnboardingChecklist extends Model
{
    protected $fillable = [
        'onboarding_request_id',
        'title',
        'stage',
        'is_completed',
        'completed_by',
        'completed_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(OnboardingRequest::class, 'onboarding_request_id');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}

