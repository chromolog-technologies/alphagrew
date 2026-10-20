<?php

namespace App\Services\Ai;

/**
 * Builds the JSON Schemas sent as structured-output formats. Objects are closed
 * (additionalProperties: false) with every property required, as structured outputs expect;
 * optional values are modelled as nullable types instead.
 */
final class JsonSchema
{
    /** @param  array<string, array<string, mixed>>  $properties */
    public static function object(array $properties): array
    {
        return [
            'type' => 'object',
            'properties' => $properties,
            'required' => array_keys($properties),
            'additionalProperties' => false,
        ];
    }

    public static function list(array $items): array
    {
        return ['type' => 'array', 'items' => $items];
    }

    public static function string(bool $nullable = false): array
    {
        return ['type' => $nullable ? ['string', 'null'] : 'string'];
    }

    public static function integer(bool $nullable = false): array
    {
        return ['type' => $nullable ? ['integer', 'null'] : 'integer'];
    }

    public static function number(): array
    {
        return ['type' => 'number'];
    }

    public static function boolean(): array
    {
        return ['type' => 'boolean'];
    }

    /** @param  list<string>  $values */
    public static function enum(array $values): array
    {
        return ['type' => 'string', 'enum' => $values];
    }

    /** Clamp an AI-supplied score into 0–100. */
    public static function score(mixed $value, int $default = 0): int
    {
        return is_numeric($value) ? max(0, min(100, (int) round((float) $value))) : $default;
    }
}
