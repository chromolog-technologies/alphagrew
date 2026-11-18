<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-institution configuration overrides of global platform settings (SRS FR-GS-004).
 */
class InstitutionSetting extends Model
{
    public const OVERRIDABLE_KEYS = [
        'defaultTimezone',
        'currency',
        'defaultTrialDays',
        'maxUploadMb',
        'aiMonthlyQuota',
        'customDomain',
        'defaultLanguage',
    ];

    protected $fillable = ['institution_id', 'key', 'value', 'updated_by'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}

