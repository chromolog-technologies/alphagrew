<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;

/**
 * The institution's placement rules (PRD §6 placement policies). One row per institution;
 * the defaults apply until an officer saves the policy. Enforced when students apply
 * (implementation plan S4-7).
 */
class PlacementPolicy extends Model
{
    use BelongsToInstitution;

    /** Defaults for an institution that has not saved a policy yet. */
    public const DEFAULTS = [
        'one_offer_rule' => true,
        'dream_offer_enabled' => false,
        'dream_offer_min_ctc' => null,
        'offer_response_days' => 7,
        'max_active_applications' => null,
        'min_profile_completion' => 0,
        'debar_on_renege' => true,
    ];

    protected $fillable = [
        'one_offer_rule',
        'dream_offer_enabled',
        'dream_offer_min_ctc',
        'offer_response_days',
        'max_active_applications',
        'min_profile_completion',
        'debar_on_renege',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'one_offer_rule' => 'boolean',
            'dream_offer_enabled' => 'boolean',
            'dream_offer_min_ctc' => 'decimal:2',
            'offer_response_days' => 'integer',
            'max_active_applications' => 'integer',
            'min_profile_completion' => 'integer',
            'debar_on_renege' => 'boolean',
        ];
    }

    /** The current institution's policy, or an unsaved one with the defaults. */
    public static function current(): self
    {
        return static::query()->first() ?? new self(self::DEFAULTS);
    }
}
