<?php

namespace App\Services\Dashboards;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Validates and runs a widget spec:
 *
 *   {
 *     source: "marks",
 *     measures:   [{field: "pass_pct", agg: "avg"}, {field: "records", agg: "count"}],
 *     dimensions: [{field: "subject"}, {field: "exam_date", grain: "month"}],   // up to 2
 *     filters:    [{field: "status", op: "in", value: ["approved", "locked"]}],
 *     having:     [{measure: 0, op: "<", value: 40}],                         // on measure results
 *     sort:       {by: "m0" | "d0", dir: "asc" | "desc"},
 *     limit:      50                                                          // 1–500
 *   }
 *
 * Every field must be in the source's catalogue and every operator in the allow-list.
 * SQL fragments come only from Field expressions; values are always bound. The viewer's
 * DashboardScope is applied by the source, whatever the spec says.
 */
class WidgetQuery
{
    public const MAX_ROWS = 500;

    public const MAX_DIMENSIONS = 2;

    public const MAX_MEASURES = 6;

    /** Operators allowed per field type. */
    private const OPERATORS = [
        Field::STRING => ['=', '!=', 'in', 'not_in', 'contains', 'is_null', 'not_null'],
        Field::NUMBER => ['=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'is_null', 'not_null'],
        Field::DATE => ['=', '>', '>=', '<', '<=', 'between', 'last_days', 'next_days', 'is_null', 'not_null'],
        Field::BOOLEAN => ['=', 'is_null', 'not_null'],
    ];

    private const HAVING_OPERATORS = ['=', '!=', '>', '>=', '<', '<='];

    private const GRAINS = ['day', 'month', 'year'];

    public function __construct(private readonly SourceRegistry $sources) {}

    /**
     * Checks a spec against the catalogue without running it (also used when saving
     * dashboards). Access to the source is checked when the spec runs, for the viewer.
     *
     * @param  array<string, mixed>  $spec
     * @return array<string, mixed> The normalised spec.
     */
    public function validate(array $spec, string $attribute = 'spec'): array
    {
        $base = Validator::make($spec, [
            'source' => ['required', 'string'],
            'measures' => ['required', 'array', 'min:1', 'max:'.self::MAX_MEASURES],
            'measures.*.field' => ['required', 'string'],
            'measures.*.agg' => ['required', 'string'],
            'measures.*.label' => ['nullable', 'string', 'max:80'],
            'dimensions' => ['nullable', 'array', 'max:'.self::MAX_DIMENSIONS],
            'dimensions.*.field' => ['required', 'string'],
            'dimensions.*.grain' => ['nullable', 'in:'.implode(',', self::GRAINS)],
            'filters' => ['nullable', 'array', 'max:10'],
            'filters.*.field' => ['required', 'string'],
            'filters.*.op' => ['required', 'string'],
            'having' => ['nullable', 'array', 'max:5'],
            'having.*.measure' => ['required', 'integer', 'min:0'],
            'having.*.op' => ['required', 'in:'.implode(',', self::HAVING_OPERATORS)],
            'having.*.value' => ['required', 'numeric'],
            'sort' => ['nullable', 'array'],
            'sort.by' => ['nullable', 'string', 'regex:/^[dm]\d$/'],
            'sort.dir' => ['nullable', 'in:asc,desc'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_ROWS],
        ]);

        if ($base->fails()) {
            throw ValidationException::withMessages($this->prefix($base->errors()->toArray(), $attribute));
        }

        $source = $this->sources->get($spec['source']);
        $errors = [];

        if (! $source) {
            throw ValidationException::withMessages(["{$attribute}.source" => ['Unknown data source.']]);
        }

        $catalog = $this->sources->catalog($source);

        foreach ($spec['measures'] as $i => $measure) {
            $field = $catalog[$measure['field']] ?? null;
            if (! $field) {
                $errors["{$attribute}.measures.{$i}.field"] = ["Unknown field {$measure['field']}."];
            } elseif (! in_array($measure['agg'], $field->aggregations, true)) {
                $errors["{$attribute}.measures.{$i}.agg"] = ["{$field->label} cannot be aggregated with {$measure['agg']}."];
            }
        }

        foreach ($spec['dimensions'] ?? [] as $i => $dimension) {
            $field = $catalog[$dimension['field']] ?? null;
            if (! $field || ! $field->dimension) {
                $errors["{$attribute}.dimensions.{$i}.field"] = ["{$dimension['field']} cannot be used to group results."];
            } elseif (isset($dimension['grain']) && $field->type !== Field::DATE) {
                $errors["{$attribute}.dimensions.{$i}.grain"] = ['Only dates can be grouped by day, month or year.'];
            }
        }

        foreach ($spec['filters'] ?? [] as $i => $filter) {
            $field = $catalog[$filter['field']] ?? null;
            if (! $field || ! $field->dimension) {
                $errors["{$attribute}.filters.{$i}.field"] = ["{$filter['field']} cannot be filtered on."];

                continue;
            }
            if (! in_array($filter['op'], self::OPERATORS[$field->type], true)) {
                $errors["{$attribute}.filters.{$i}.op"] = ["{$filter['op']} cannot be used with {$field->label}."];

                continue;
            }
            if ($message = $this->valueError($filter['op'], $filter['value'] ?? null, $field)) {
                $errors["{$attribute}.filters.{$i}.value"] = [$message];
            }
        }

        foreach ($spec['having'] ?? [] as $i => $having) {
            if (! isset($spec['measures'][$having['measure']])) {
                $errors["{$attribute}.having.{$i}.measure"] = ['There is no such measure.'];
            }
        }

        if (isset($spec['sort']['by'])) {
            $index = (int) substr($spec['sort']['by'], 1);
            $list = $spec['sort']['by'][0] === 'd' ? ($spec['dimensions'] ?? []) : $spec['measures'];
            if (! isset($list[$index])) {
                $errors["{$attribute}.sort.by"] = ['Sort by a measure or dimension of this widget.'];
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return [
            'source' => $spec['source'],
            'measures' => array_values(array_map(fn ($m) => array_filter([
                'field' => $m['field'], 'agg' => $m['agg'], 'label' => $m['label'] ?? null,
            ], fn ($v) => $v !== null), $spec['measures'])),
            'dimensions' => array_values(array_map(fn ($d) => array_filter([
                'field' => $d['field'], 'grain' => $d['grain'] ?? null,
            ], fn ($v) => $v !== null), $spec['dimensions'] ?? [])),
            'filters' => array_values(array_map(fn ($f) => [
                'field' => $f['field'], 'op' => $f['op'], 'value' => $f['value'] ?? null,
            ], $spec['filters'] ?? [])),
            'having' => array_values($spec['having'] ?? []),
            'sort' => isset($spec['sort']['by']) ? ['by' => $spec['sort']['by'], 'dir' => $spec['sort']['dir'] ?? 'desc'] : null,
            'limit' => (int) ($spec['limit'] ?? 100),
        ];
    }

    /**
     * Runs a spec for a user, within their scope.
     *
     * @param  array<string, mixed>  $spec
     * @return array{columns: list<array<string, mixed>>, rows: list<array<string, mixed>>, truncated: bool, scope: array<string, mixed>}
     */
    public function run(User $user, array $spec): array
    {
        $spec = $this->validate($spec);
        $scope = DashboardScope::for($user);
        $source = $this->sources->get($spec['source']);

        if ($scope->level === DashboardScope::NONE || ! $source->allowedFor($user, $scope)) {
            throw new HttpException(403, "You do not have access to {$source->label()} data.");
        }

        $catalog = $this->sources->catalog($source);
        $query = $source->newQuery($scope);
        $columns = [];
        $groupBy = [];

        foreach ($spec['dimensions'] as $i => $dimension) {
            $field = $catalog[$dimension['field']];
            $this->joinAll($source, $query, $field);
            $expression = isset($dimension['grain']) ? DataSource::dateBucket($field->expression, $dimension['grain']) : $field->expression;

            $query->selectRaw("{$expression} as d{$i}");
            $groupBy[] = $expression;
            $columns[] = [
                'key' => "d{$i}", 'role' => 'dimension', 'field' => $field->key,
                'label' => $field->label.(isset($dimension['grain']) ? " ({$dimension['grain']})" : ''),
                'type' => isset($dimension['grain']) ? Field::STRING : $field->type,
            ];
        }

        $measureSql = [];
        foreach ($spec['measures'] as $i => $measure) {
            $field = $catalog[$measure['field']];
            $this->joinAll($source, $query, $field);
            $measureSql[$i] = $this->aggregate($measure['agg'], $field->expression);

            $query->selectRaw("{$measureSql[$i]} as m{$i}");
            $columns[] = [
                'key' => "m{$i}", 'role' => 'measure', 'field' => $field->key, 'agg' => $measure['agg'],
                'label' => $measure['label'] ?? $this->measureLabel($measure['agg'], $field),
                'type' => Field::NUMBER,
            ];
        }

        foreach ($spec['filters'] as $filter) {
            $field = $catalog[$filter['field']];
            $this->joinAll($source, $query, $field);
            $this->applyFilter($query, $field, $filter['op'], $filter['value']);
        }

        foreach ($groupBy as $expression) {
            $query->groupByRaw($expression);
        }

        foreach ($spec['having'] as $having) {
            $query->havingRaw("{$measureSql[$having['measure']]} {$having['op']} ".self::number($having['value']));
        }

        $sort = $spec['sort'] ?? ($groupBy ? ['by' => 'd0', 'dir' => 'asc'] : null);
        if ($sort) {
            $index = (int) substr($sort['by'], 1);
            $expression = $sort['by'][0] === 'd' ? $groupBy[$index] : $measureSql[$index];
            $query->orderByRaw("{$expression} ".($sort['dir'] === 'asc' ? 'asc' : 'desc'));
        }

        $rows = $query->limit($spec['limit'] + 1)->toBase()->get()
            ->map(fn ($row) => $this->castRow((array) $row, $columns))
            ->all();

        $truncated = count($rows) > $spec['limit'];

        return [
            'columns' => $columns,
            'rows' => array_slice($rows, 0, $spec['limit']),
            'truncated' => $truncated,
            'scope' => $scope->toArray(),
        ];
    }

    private function joinAll(DataSource $source, Builder $query, Field $field): void
    {
        foreach ($field->joins as $join) {
            $source->join($query, $join);
        }
    }

    private function aggregate(string $agg, string $expression): string
    {
        return match ($agg) {
            'count' => "COUNT({$expression})",
            'count_distinct' => "COUNT(DISTINCT {$expression})",
            'sum' => "SUM({$expression})",
            'avg' => "AVG({$expression})",
            'min' => "MIN({$expression})",
            'max' => "MAX({$expression})",
        };
    }

    private function measureLabel(string $agg, Field $field): string
    {
        // Measures with a single aggregation ("Present %", "Absences") are already named for it.
        if ($field->aggregations === [$agg]) {
            return $field->label;
        }

        return match ($agg) {
            'count' => "Count of {$field->label}",
            'count_distinct' => "Distinct {$field->label}",
            'sum' => "Total {$field->label}",
            'avg' => "Average {$field->label}",
            'min' => "Lowest {$field->label}",
            'max' => "Highest {$field->label}",
        };
    }

    private function applyFilter(Builder $query, Field $field, string $op, mixed $value): void
    {
        $column = $field->expression;

        // Numbers are inlined: PDO binds floats as strings, and SQLite compares computed
        // values (AVG, COALESCE, CASE) with strings as "always smaller". self::number()
        // only ever emits a formatted float, and the value was validated as numeric.
        if ($field->type === Field::NUMBER && ! in_array($op, ['is_null', 'not_null'], true)) {
            match ($op) {
                'in' => $query->whereRaw("{$column} IN (".implode(',', array_map(self::number(...), $value)).')'),
                'between' => $query->whereRaw("{$column} BETWEEN ".self::number($value[0]).' AND '.self::number($value[1])),
                default => $query->whereRaw("{$column} {$op} ".self::number($value)),
            };

            return;
        }

        match ($op) {
            'is_null' => $query->whereRaw("{$column} IS NULL"),
            'not_null' => $query->whereRaw("{$column} IS NOT NULL"),
            'in' => $query->whereRaw("{$column} IN (".implode(',', array_fill(0, count($value), '?')).')', array_values($value)),
            'not_in' => $query->whereRaw("({$column} IS NULL OR {$column} NOT IN (".implode(',', array_fill(0, count($value), '?')).'))', array_values($value)),
            'contains' => $query->whereRaw("{$column} LIKE ?", ['%'.addcslashes((string) $value, '%_\\').'%']),
            'between' => $query->whereRaw("{$column} BETWEEN ? AND ?", [$value[0], $value[1]]),
            'last_days' => $query->whereRaw("{$column} >= ?", [now()->subDays((int) $value)->toDateString()]),
            'next_days' => $query->whereRaw("{$column} >= ? AND {$column} <= ?", [now()->toDateString(), now()->addDays((int) $value)->endOfDay()->toDateTimeString()]),
            default => $query->whereRaw("{$column} {$op} ?", [$field->type === Field::BOOLEAN ? (int) filter_var($value, FILTER_VALIDATE_BOOLEAN) : $value]),
        };
    }

    /** A validated numeric value as a SQL literal. */
    private static function number(mixed $value): string
    {
        return sprintf('%F', (float) $value);
    }

    private function valueError(string $op, mixed $value, Field $field): ?string
    {
        $numbers = fn (mixed $values) => is_array($values) && array_filter($values, fn ($v) => ! is_numeric($v)) === [];

        return match (true) {
            in_array($op, ['is_null', 'not_null'], true) => null,
            $field->type === Field::NUMBER && in_array($op, ['in', 'between'], true) && ! $numbers($value) => 'The values must be numbers.',
            in_array($op, ['in', 'not_in'], true) => is_array($value) && $value !== [] && count($value) <= 100 && $this->allScalar($value) ? null : 'Choose at least one value.',
            $op === 'between' => is_array($value) && count($value) === 2 && $this->allScalar($value) ? null : 'Give a start and an end value.',
            in_array($op, ['last_days', 'next_days'], true) => is_numeric($value) && $value >= 1 && $value <= 3660 ? null : 'Give a number of days between 1 and 3660.',
            $value === null || is_array($value) => 'A value is required.',
            $field->type === Field::NUMBER && ! is_numeric($value) => 'The value must be a number.',
            $field->type === Field::DATE && strtotime((string) $value) === false => 'The value must be a date.',
            default => null,
        };
    }

    private function allScalar(array $values): bool
    {
        foreach ($values as $value) {
            if (! is_scalar($value)) {
                return false;
            }
        }

        return true;
    }

    /** @param list<array<string, mixed>> $columns */
    private function castRow(array $row, array $columns): array
    {
        foreach ($columns as $column) {
            $value = $row[$column['key']] ?? null;
            $row[$column['key']] = match (true) {
                $value === null => null,
                $column['type'] === Field::NUMBER => round((float) $value, 2),
                $column['type'] === Field::BOOLEAN => (bool) $value,
                default => $value,
            };
        }

        return $row;
    }

    /** @param array<string, list<string>> $errors */
    private function prefix(array $errors, string $attribute): array
    {
        $prefixed = [];
        foreach ($errors as $key => $messages) {
            $prefixed["{$attribute}.{$key}"] = $messages;
        }

        return $prefixed;
    }
}
