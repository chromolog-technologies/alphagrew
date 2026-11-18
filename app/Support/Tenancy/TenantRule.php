<?php

namespace App\Support\Tenancy;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rules\Unique;

/**
 * exists/unique validation rules limited to the current institution. Validation queries the
 * database directly, so the model global scope does not apply to plain Rule::exists/unique.
 */
final class TenantRule
{
    public static function exists(string $table, string $column = 'NULL'): Exists
    {
        return self::scoped(Rule::exists($table, $column));
    }

    public static function unique(string $table, string $column = 'NULL'): Unique
    {
        return self::scoped(Rule::unique($table, $column));
    }

    /**
     * @template T of Exists|Unique
     *
     * @param  T  $rule
     * @return T
     */
    private static function scoped(Exists|Unique $rule): Exists|Unique
    {
        $tenant = app(Tenant::class);

        return $tenant->scopes() ? $rule->where('institution_id', $tenant->id()) : $rule;
    }
}
