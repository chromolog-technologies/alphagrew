<?php

namespace App\Services\Dashboards;

/**
 * One field a widget may use. The SQL expression is written by developers (or built from a
 * custom field's validated key and id), never taken from a request.
 */
final class Field
{
    public const STRING = 'string';

    public const NUMBER = 'number';

    public const DATE = 'date';

    public const BOOLEAN = 'boolean';

    public const AGGREGATIONS = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max'];

    /**
     * @param  list<string>  $aggregations  Allowed as a measure with these aggregations.
     * @param  list<string>  $joins  Named joins of the source this expression needs.
     * @param  list<string>  $options  Known values, offered as filter choices.
     */
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly string $type,
        public readonly string $expression,
        public readonly bool $dimension = true,
        public readonly array $aggregations = [],
        public readonly array $joins = [],
        public readonly array $options = [],
        public readonly ?string $group = null,
        public readonly bool $custom = false,
    ) {}

    public static function dimension(string $key, string $label, string $type, string $expression, array $joins = [], array $options = []): self
    {
        return new self($key, $label, $type, $expression, true, [], $joins, $options);
    }

    public static function measure(string $key, string $label, string $expression, array $aggregations, array $joins = []): self
    {
        return new self($key, $label, self::NUMBER, $expression, false, $aggregations, $joins);
    }

    /** A number that can be grouped by and aggregated. */
    public static function number(string $key, string $label, string $expression, array $joins = [], array $aggregations = ['sum', 'avg', 'min', 'max']): self
    {
        return new self($key, $label, self::NUMBER, $expression, true, $aggregations, $joins);
    }

    public function withGroup(string $group): self
    {
        return new self($this->key, $this->label, $this->type, $this->expression, $this->dimension, $this->aggregations, $this->joins, $this->options, $group, $this->custom);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'type' => $this->type,
            'dimension' => $this->dimension,
            'aggregations' => $this->aggregations,
            'options' => $this->options,
            'group' => $this->group,
            'custom' => $this->custom,
        ];
    }
}
