<?php

namespace App\Models;

use App\Support\Campus\SkillCatalog;
use App\Support\Tenancy\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A skill in the catalogue. institution_id = null rows are the platform catalogue,
 * visible to every institution; institutions can add their own rows on top.
 */
class Skill extends Model
{
    protected $fillable = [
        'institution_id',
        'name',
        'slug',
        'lookup_key',
        'category',
        'aliases',
        'needs_review',
    ];

    protected function casts(): array
    {
        return [
            'aliases' => 'array',
            'needs_review' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Platform skills plus the current institution's own. Not BelongsToInstitution,
        // because platform rows (institution_id null) must stay visible.
        static::addGlobalScope('platform_or_institution', function (Builder $query): void {
            $tenant = app(Tenant::class);

            if ($tenant->scopes()) {
                $query->where(function (Builder $query) use ($tenant): void {
                    $query->whereNull($query->qualifyColumn('institution_id'))
                        ->orWhere($query->qualifyColumn('institution_id'), $tenant->id());
                });
            }
        });

        static::creating(function (Skill $skill): void {
            $tenant = app(Tenant::class);

            if ($tenant->scopes()) {
                $skill->institution_id = $tenant->id();
            }

            $skill->slug ??= SkillCatalog::slug($skill->name);
            $skill->lookup_key ??= SkillCatalog::key($skill->name);
        });
    }

    public function isPlatform(): bool
    {
        return $this->institution_id === null;
    }
}
