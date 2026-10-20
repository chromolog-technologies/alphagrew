<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A company's recruitment visit to one institution; groups that company's job postings.
 */
class PlacementDrive extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const STATUSES = ['draft', 'published', 'closed'];

    protected $fillable = [
        'company_id',
        'title',
        'starts_on',
        'ends_on',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class, 'drive_id');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }
}
