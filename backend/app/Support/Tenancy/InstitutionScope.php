<?php

namespace App\Support\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Adds "WHERE <table>.institution_id = <current institution>" to every query on a tenant model.
 */
class InstitutionScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenant = app(Tenant::class);

        if ($tenant->scopes()) {
            $builder->where($model->qualifyColumn('institution_id'), $tenant->id());
        }
    }
}
