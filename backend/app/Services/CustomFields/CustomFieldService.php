<?php

namespace App\Services\CustomFields;

use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Validation, storage and output of custom field values.
 *
 * Payloads use `customFields: {key: value}`. Keys that are not active fields of the entity
 * are rejected by validation, so save() only ever sees known keys.
 */
class CustomFieldService
{
    /** @var array<string, Collection<int, CustomFieldDefinition>> */
    private array $cache = [];

    /**
     * Active fields of an entity in display order, for the current institution.
     *
     * @return Collection<int, CustomFieldDefinition>
     */
    public function definitions(string $entity): Collection
    {
        return $this->cache[$entity] ??= CustomFieldDefinition::query()
            ->where('entity', $entity)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /**
     * Rules for `customFields`, to merge into a form request.
     *
     * @param  bool  $creating  When creating, required fields must be sent. When updating,
     *                          fields that are left out keep their value, but a required
     *                          field that is sent cannot be cleared.
     * @return array<string, mixed>
     */
    public function rules(string $entity, bool $creating = false, string $prefix = 'customFields'): array
    {
        $definitions = $this->definitions($entity);

        if ($definitions->isEmpty()) {
            return [$prefix => ['sometimes', 'nullable', 'array', 'max:0']];
        }

        $hasRequired = $creating && $definitions->contains('is_required', true);
        $rules = [$prefix => [$hasRequired ? 'required' : 'sometimes', 'array:'.$definitions->pluck('key')->implode(',')]];

        foreach ($definitions as $definition) {
            $field = "{$prefix}.{$definition->key}";
            $presence = match (true) {
                $definition->is_required && $creating => 'required',
                $definition->is_required => 'sometimes|required',
                default => 'nullable',
            };

            $rules[$field] = [...explode('|', $presence), ...$this->typeRules($definition)];

            if ($definition->type === CustomFieldDefinition::TYPE_MULTISELECT) {
                $rules["{$field}.*"] = ['string', Rule::in($definition->options ?? [])];
            }
        }

        return $rules;
    }

    /** Readable names for validation messages ("Blood group" rather than "customFields.blood_group"). */
    public function attributes(string $entity, string $prefix = 'customFields'): array
    {
        return $this->definitions($entity)
            ->mapWithKeys(fn (CustomFieldDefinition $definition) => ["{$prefix}.{$definition->key}" => $definition->label])
            ->all();
    }

    /**
     * Writes the given values. A null, empty string or empty list removes the value.
     *
     * @param  array<string, mixed>  $values  Validated `customFields` payload.
     */
    public function save(Model $record, string $entity, array $values): void
    {
        $definitions = $this->definitions($entity)->keyBy('key');

        foreach ($values as $key => $value) {
            $definition = $definitions->get($key);

            if (! $definition) {
                continue;
            }

            if ($value === null || $value === '' || $value === []) {
                CustomFieldValue::query()
                    ->where('definition_id', $definition->id)
                    ->where('entity_id', $record->getKey())
                    ->delete();

                continue;
            }

            CustomFieldValue::query()->updateOrCreate(
                ['definition_id' => $definition->id, 'entity_id' => $record->getKey()],
                ['entity' => $entity, ...$this->encode($definition, $value)],
            );
        }
    }

    /**
     * Current values of a record as `{key: value}`, with every active field present
     * (null when unset), for API responses and forms.
     *
     * @return array<string, mixed>
     */
    public function valuesFor(Model $record, string $entity): array
    {
        $definitions = $this->definitions($entity);

        if ($definitions->isEmpty()) {
            return [];
        }

        $stored = CustomFieldValue::query()
            ->whereIn('definition_id', $definitions->pluck('id'))
            ->where('entity_id', $record->getKey())
            ->get()
            ->keyBy('definition_id');

        return $definitions
            ->mapWithKeys(fn (CustomFieldDefinition $definition) => [
                $definition->key => $this->decode($definition, $stored->get($definition->id)),
            ])
            ->all();
    }

    /**
     * A record's JSON with its custom field values under `customFields`, for controllers that
     * return plain models.
     *
     * @return array<string, mixed>
     */
    public function present(Model $record, string $entity): array
    {
        return [...$record->toArray(), 'customFields' => $this->valuesFor($record, $entity)];
    }

    /**
     * present() for a list of records, reading all values in one query.
     *
     * @param  iterable<int, Model>  $records
     * @return list<array<string, mixed>>
     */
    public function presentMany(iterable $records, string $entity): array
    {
        $records = collect($records);
        $values = $this->valuesForMany($records, $entity);

        return $records
            ->map(fn (Model $record) => [...$record->toArray(), 'customFields' => $values[$record->getKey()] ?? []])
            ->values()
            ->all();
    }

    /**
     * valuesFor() for many records of one entity in a single query.
     *
     * @param  iterable<int, Model>  $records
     * @return array<int, array<string, mixed>> Record id → `{key: value}`.
     */
    public function valuesForMany(iterable $records, string $entity): array
    {
        $ids = [];
        foreach ($records as $record) {
            $ids[] = $record->getKey();
        }

        $definitions = $this->definitions($entity);
        if ($ids === []) {
            return [];
        }

        $stored = $definitions->isEmpty() ? collect() : CustomFieldValue::query()
            ->whereIn('definition_id', $definitions->pluck('id'))
            ->whereIn('entity_id', $ids)
            ->get()
            ->groupBy('entity_id');

        $result = [];
        foreach ($ids as $id) {
            $values = $stored->get($id, collect())->keyBy('definition_id');
            $result[$id] = $definitions
                ->mapWithKeys(fn (CustomFieldDefinition $definition) => [
                    $definition->key => $this->decode($definition, $values->get($definition->id)),
                ])
                ->all();
        }

        return $result;
    }

    /** @return array<int, mixed> */
    private function typeRules(CustomFieldDefinition $definition): array
    {
        return match ($definition->type) {
            CustomFieldDefinition::TYPE_NUMBER => ['numeric', 'between:-99999999999,99999999999'],
            CustomFieldDefinition::TYPE_DATE => ['date'],
            CustomFieldDefinition::TYPE_BOOLEAN => ['boolean'],
            CustomFieldDefinition::TYPE_SELECT => ['string', Rule::in($definition->options ?? [])],
            CustomFieldDefinition::TYPE_MULTISELECT => ['array'],
            default => ['string', 'max:1000'],
        };
    }

    /** @return array{value_text: ?string, value_number: ?float, value_date: ?string} */
    private function encode(CustomFieldDefinition $definition, mixed $value): array
    {
        $row = ['value_text' => null, 'value_number' => null, 'value_date' => null];

        return match ($definition->type) {
            CustomFieldDefinition::TYPE_NUMBER => [...$row, 'value_number' => (float) $value],
            CustomFieldDefinition::TYPE_BOOLEAN => [...$row, 'value_number' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0],
            CustomFieldDefinition::TYPE_DATE => [...$row, 'value_date' => date('Y-m-d', strtotime((string) $value))],
            CustomFieldDefinition::TYPE_MULTISELECT => [...$row, 'value_text' => json_encode(array_values(array_unique((array) $value)))],
            default => [...$row, 'value_text' => (string) $value],
        };
    }

    private function decode(CustomFieldDefinition $definition, ?CustomFieldValue $value): mixed
    {
        if (! $value) {
            return $definition->type === CustomFieldDefinition::TYPE_MULTISELECT ? [] : null;
        }

        return match ($definition->type) {
            CustomFieldDefinition::TYPE_NUMBER => $value->value_number,
            CustomFieldDefinition::TYPE_BOOLEAN => $value->value_number !== null ? (bool) $value->value_number : null,
            CustomFieldDefinition::TYPE_DATE => $value->value_date?->format('Y-m-d'),
            CustomFieldDefinition::TYPE_MULTISELECT => json_decode((string) $value->value_text, true) ?: [],
            default => $value->value_text,
        };
    }
}
