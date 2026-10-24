<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One role a company recruits for within a drive. Students apply to postings.
 */
class JobPosting extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const STATUSES = ['draft', 'open', 'closed'];

    public const EMPLOYMENT_TYPES = ['full_time', 'internship', 'ppo'];

    protected $fillable = [
        'drive_id',
        'company_id',
        'title',
        'description',
        'employment_type',
        'location',
        'ctc_min_paise',
        'ctc_max_paise',
        'stipend_paise',
        'package_display',
        'openings',
        'required_skills',
        'apply_deadline',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'ctc_min_paise' => 'integer',
            'ctc_max_paise' => 'integer',
            'stipend_paise' => 'integer',
            'openings' => 'integer',
            'required_skills' => 'array',
            'apply_deadline' => 'datetime',
        ];
    }

    public function drive(): BelongsTo
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function eligibilityRules(): HasMany
    {
        return $this->hasMany(EligibilityRule::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    /** Open postings in published drives: what students can see. */
    public function scopeVisibleToStudents(Builder $query): Builder
    {
        return $query
            ->where('status', 'open')
            ->whereHas('drive', fn (Builder $drive) => $drive->where('status', 'published'));
    }

    public function acceptsApplications(): bool
    {
        return $this->status === 'open'
            && $this->drive?->isPublished()
            && ($this->apply_deadline === null || $this->apply_deadline->isFuture());
    }
}
