<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Institution onboarding pipeline item spanning the 9 SRS §5.3 stages.
 */
class OnboardingRequest extends Model
{
    public const STAGES = [
        'new',
        'verification',
        'demo',
        'proposal',
        'agreement',
        'payment',
        'configuration',
        'training',
        'go_live',
    ];

    public const STATUSES = ['active', 'blocked', 'completed', 'cancelled'];

    protected $fillable = [
        'lead_id',
        'institution_id',
        'institution_name',
        'code',
        'institution_type',
        'contact_name',
        'contact_email',
        'contact_phone',
        'country',
        'state',
        'stage',
        'status',
        'owner_id',
        'target_go_live_at',
        'blocker_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return ['target_go_live_at' => 'date'];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(OnboardingChecklist::class)->orderBy('sort_order')->orderBy('id');
    }
}

