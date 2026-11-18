<?php

namespace App\Services\Dashboards;

use App\Models\CustomFieldDefinition;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

/**
 * A table (plus joins) that dashboard widgets can query. Subclasses declare their fields,
 * named joins and how a DashboardScope limits rows.
 *
 * Joined tables are reached through foreign keys from tenant-scoped base rows, so they
 * belong to the same institution; joins by code (departments) also match institution_id.
 */
abstract class DataSource
{
    /** @var array<string, true> */
    private array $applied = [];

    abstract public function key(): string;

    abstract public function label(): string;

    abstract public function description(): string;

    /** The scoped base query: the model's global scopes (tenant, soft deletes) apply. */
    abstract protected function baseQuery(): Builder;

    /** Expression counted by "Number of records". */
    abstract protected function primaryKey(): string;

    /** @return list<Field> */
    abstract protected function fields(): array;

    /**
     * Named joins: name => [dependencies, closure(Builder)].
     *
     * @return array<string, array{0: list<string>, 1: Closure(Builder): void}>
     */
    abstract protected function joins(): array;

    /**
     * Custom field record types this source can join, with the expression holding the
     * record id, e.g. ['student' => 'attendance.student_id'].
     *
     * @return array<string, string>
     */
    abstract protected function customFieldEntities(): array;

    abstract protected function applyScope(Builder $query, DashboardScope $scope): void;

    abstract public function allowedFor(User $user, DashboardScope $scope): bool;

    /**
     * Fields including the active custom fields of the joinable record types.
     *
     * @param  iterable<CustomFieldDefinition>  $definitions
     * @return array<string, Field>
     */
    public function catalog(iterable $definitions): array
    {
        $fields = [Field::measure('records', 'Number of records', $this->primaryKey(), ['count'])];
        array_push($fields, ...$this->fields());

        $entities = $this->customFieldEntities();
        foreach ($definitions as $definition) {
            if (isset($entities[$definition->entity])) {
                $fields[] = $this->customField($definition);
            }
        }

        $catalog = [];
        foreach ($fields as $field) {
            $catalog[$field->key] = $field;
        }

        return $catalog;
    }

    public function newQuery(DashboardScope $scope): Builder
    {
        $this->applied = [];
        $query = $this->baseQuery();
        $this->applyScope($query, $scope);

        return $query;
    }

    /** Applies a named join (and the joins it depends on) once. */
    public function join(Builder $query, string $name): void
    {
        if (isset($this->applied[$name])) {
            return;
        }

        if (str_starts_with($name, 'cf:')) {
            $this->joinCustomField($query, $name);
            $this->applied[$name] = true;

            return;
        }

        [$dependencies, $apply] = $this->joins()[$name] ?? throw new \LogicException("Unknown join {$name} on {$this->key()}.");

        foreach ($dependencies as $dependency) {
            $this->join($query, $dependency);
        }

        $apply($query);
        $this->applied[$name] = true;
    }

    /** @return array<string, mixed> */
    public function describe(iterable $definitions): array
    {
        $fields = array_values(array_map(fn (Field $field) => $field->toArray(), $this->catalog($definitions)));

        return ['key' => $this->key(), 'label' => $this->label(), 'description' => $this->description(), 'fields' => $fields];
    }

    /** SQL for a date bucketed by day, month or year, portable across MySQL and SQLite. */
    public static function dateBucket(string $expression, string $grain): string
    {
        $format = match ($grain) {
            'year' => '%Y',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('{$format}', {$expression})"
            : "DATE_FORMAT({$expression}, '{$format}')";
    }

    /** Rows that can never match, for scopes with nothing to see. */
    protected function none(Builder $query): void
    {
        $query->whereRaw('1 = 0');
    }

    /** @param list<int|string> $values */
    protected function whereInOrNone(Builder $query, string $column, array $values): void
    {
        $values === [] ? $this->none($query) : $query->whereIn($column, $values);
    }

    /** Joins departments by code within the same institution. */
    protected function joinDepartmentByCode(Builder $query, string $alias, string $codeColumn, string $institutionColumn): void
    {
        $query->leftJoin("departments as {$alias}", function (JoinClause $join) use ($alias, $codeColumn, $institutionColumn): void {
            $join->on("{$alias}.code", '=', $codeColumn)
                ->on("{$alias}.institution_id", '=', $institutionColumn)
                ->whereNull("{$alias}.deleted_at");
        });
    }

    private function customField(CustomFieldDefinition $definition): Field
    {
        $alias = "cf_{$definition->entity}_{$definition->key}";
        $column = "{$alias}.{$definition->valueColumn()}";
        $type = match ($definition->type) {
            CustomFieldDefinition::TYPE_NUMBER => Field::NUMBER,
            CustomFieldDefinition::TYPE_DATE => Field::DATE,
            CustomFieldDefinition::TYPE_BOOLEAN => Field::BOOLEAN,
            default => Field::STRING,
        };
        $join = "cf:{$definition->entity}:{$definition->key}:{$definition->id}";
        $entityLabel = ucfirst($definition->entity);

        return new Field(
            key: "cf.{$definition->entity}.{$definition->key}",
            label: "{$definition->label} ({$entityLabel})",
            type: $type,
            expression: $column,
            dimension: true,
            aggregations: $type === Field::NUMBER ? ['sum', 'avg', 'min', 'max'] : ['count_distinct'],
            joins: [$join],
            options: $definition->hasOptions() ? ($definition->options ?? []) : [],
            group: 'Custom fields',
            custom: true,
        );
    }

    private function joinCustomField(Builder $query, string $name): void
    {
        // cf:<entity>:<key>:<definition id>; entity and key were validated when the field was created.
        [, $entity, $key, $definitionId] = explode(':', $name);
        $alias = "cf_{$entity}_{$key}";
        $recordId = $this->customFieldEntities()[$entity];

        $query->leftJoin("custom_field_values as {$alias}", function (JoinClause $join) use ($alias, $recordId, $definitionId): void {
            $join->on("{$alias}.entity_id", '=', $recordId)
                ->where("{$alias}.definition_id", '=', (int) $definitionId);
        });
    }
}
