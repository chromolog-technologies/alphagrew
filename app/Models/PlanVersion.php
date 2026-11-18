<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Immutable commercial terms snapshot for a Plan (SRS §5.6 FR-PL-005).
 */
class PlanVersion extends Model
{
    public const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];

    public const CREDIT_RESET_PERIODS = ['monthly', 'quarterly', 'yearly', 'none'];

    public const FEATURE_KEYS = [
        'placement',
        'assessments',
        'resume_ai',
        'ai_interviews',
        'analytics',
        'api_access',
        'custom_branding',
    ];

    protected $fillable = [
        'plan_id',
        'version_number',
        'billing_cycle',
        'price',
        'setup_fee',
        'currency',
        'trial_days',
        'student_limit',
        'faculty_limit',
        'campus_limit',
        'department_limit',
        'recruiter_limit',
        'storage_limit_mb',
        'api_requests_limit',
        'ai_credit_allocation',
        'ai_credit_reset_period',
        'features',
        'is_current',
        'published_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'price' => 'float',
            'setup_fee' => 'float',
            'trial_days' => 'integer',
            'student_limit' => 'integer',
            'faculty_limit' => 'integer',
            'campus_limit' => 'integer',
            'department_limit' => 'integer',
            'recruiter_limit' => 'integer',
            'storage_limit_mb' => 'integer',
            'api_requests_limit' => 'integer',
            'ai_credit_allocation' => 'float',
            'features' => 'array',
            'is_current' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /** Normalized monthly price for MRR calculation. */
    public function monthlyEquivalent(): float
    {
        return match ($this->billing_cycle) {
            'quarterly' => round($this->price / 3, 2),
            'yearly' => round($this->price / 12, 2),
            default => round($this->price, 2),
        };
    }

    /** Snapshot copied onto subscriptions so future plan edits never mutate agreed entitlements. */
    public function toEntitlementSnapshot(): array
    {
        return [
            'planCode' => $this->relationLoaded('plan') ? $this->plan?->code : null,
            'planName' => $this->relationLoaded('plan') ? $this->plan?->name : null,
            'versionNumber' => $this->version_number,
            'billingCycle' => $this->billing_cycle,
            'price' => round((float) $this->price, 2),
            'setupFee' => round((float) $this->setup_fee, 2),
            'currency' => $this->currency,
            'limits' => [
                'students' => $this->student_limit,
                'faculty' => $this->faculty_limit,
                'campuses' => $this->campus_limit,
                'departments' => $this->department_limit,
                'recruiters' => $this->recruiter_limit,
                'storageMb' => $this->storage_limit_mb,
                'apiRequests' => $this->api_requests_limit,
                'aiCredits' => round((float) $this->ai_credit_allocation, 2),
                'aiCreditResetPeriod' => $this->ai_credit_reset_period,
            ],
            'features' => collect(self::FEATURE_KEYS)->mapWithKeys(
                fn (string $key) => [$key => (bool) ($this->features[$key] ?? false)]
            )->all(),
        ];
    }
}

