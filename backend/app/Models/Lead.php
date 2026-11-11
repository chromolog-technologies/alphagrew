<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sales CRM lead tracked toward onboarding (SRS §5.17).
 */
class Lead extends Model
{
    public const STAGES = ['new', 'contacted', 'demo_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'];

    public const SOURCES = ['website', 'referral', 'outbound', 'event', 'partner'];

    protected $fillable = [
        'organization_name',
        'contact_name',
        'contact_email',
        'contact_phone',
        'source',
        'stage',
        'owner_id',
        'interested_plan_id',
        'expected_students',
        'expected_mrr',
        'next_follow_up_at',
        'demo_outcome',
        'lost_reason',
        'converted_onboarding_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'expected_students' => 'integer',
            'expected_mrr' => 'float',
            'next_follow_up_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function interestedPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'interested_plan_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(SalesActivity::class)->latest('occurred_at')->latest('id');
    }
}

