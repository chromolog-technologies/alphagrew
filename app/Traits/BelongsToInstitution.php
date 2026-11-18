<?php

namespace App\Traits;

use App\Models\Institution;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * For models whose rows belong to one institution.
 *
 * - Reads are filtered to the current institution (InstitutionScope), including
 *   route-model binding, so another institution's id returns 404.
 * - For an institution user, new rows always get that user's institution and
 *   institution_id cannot be changed, whatever the request sends.
 * - Without a tenant context (console, seeders, self-registration) institution_id
 *   must be given explicitly.
 *
 * Use Model::withoutGlobalScope(InstitutionScope::class) only in platform-level code.
 */
trait BelongsToInstitution
{
    public static function bootBelongsToInstitution(): void
    {
        static::addGlobalScope(new InstitutionScope());

        static::creating(function (Model $model): void {
            $tenant = app(Tenant::class);

            if ($tenant->scopes()) {
                $model->setAttribute('institution_id', $tenant->id());
            }
        });

        static::updating(function (Model $model): void {
            if (app(Tenant::class)->scopes() && $model->isDirty('institution_id')) {
                $model->setAttribute('institution_id', $model->getOriginal('institution_id'));
            }
        });
    }

    public function initializeBelongsToInstitution(): void
    {
        $this->mergeFillable(['institution_id']);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
