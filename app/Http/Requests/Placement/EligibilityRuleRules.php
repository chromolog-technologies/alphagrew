<?php

namespace App\Http\Requests\Placement;

use App\Models\EligibilityRule;
use App\Models\Skill;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validation for a list of eligibility rules ({field, operator, value}), shared by job saving
 * and the live preview. The value's shape depends on the operator: a number for ≥ / ≤ / =,
 * a list for in / not in, and {skillId, minLevel} for skills.
 */
trait EligibilityRuleRules
{
    /** @return array<string, mixed> */
    protected function eligibilityRules(string $prefix = 'eligibility'): array
    {
        return [
            $prefix => ['sometimes', 'array', 'max:20'],
            "{$prefix}.*.field" => ['required', Rule::in(array_keys(EligibilityRule::FIELDS))],
            "{$prefix}.*.operator" => ['required', 'string'],
            "{$prefix}.*.value" => ['present'],
        ];
    }

    protected function validateEligibilityValues(Validator $validator, string $prefix = 'eligibility'): void
    {
        foreach ((array) $this->input($prefix, []) as $index => $rule) {
            $field = $rule['field'] ?? null;
            $operator = $rule['operator'] ?? null;
            $value = $rule['value'] ?? null;
            $key = "{$prefix}.{$index}";

            if (! isset(EligibilityRule::FIELDS[$field])) {
                continue;
            }

            if (! in_array($operator, EligibilityRule::FIELDS[$field], true)) {
                $validator->errors()->add("{$key}.operator", 'This operator cannot be used with '.$field.'.');

                continue;
            }

            $valid = match (true) {
                // Platform skills and the institution's own (the Skill scope).
                $field === 'skill' => is_array($value) && isset($value['skillId'], $value['minLevel'])
                    && is_numeric($value['minLevel']) && $value['minLevel'] >= 1 && $value['minLevel'] <= 5
                    && Skill::query()->whereKey((int) $value['skillId'])->exists(),
                in_array($operator, ['in', 'not_in'], true) => is_array($value) && $value !== [] && collect($value)->every(fn ($item) => is_scalar($item) && trim((string) $item) !== ''),
                default => is_numeric($value) && $value >= 0,
            };

            if (! $valid) {
                $validator->errors()->add("{$key}.value", match (true) {
                    $field === 'skill' => 'Choose a skill and a minimum level from 1 to 5.',
                    in_array($operator, ['in', 'not_in'], true) => 'Choose at least one value.',
                    default => 'Enter a number of 0 or more.',
                });
            }
        }
    }

    /** @return list<array{field: string, operator: string, value: mixed}> */
    protected function normalisedRules(string $prefix = 'eligibility'): array
    {
        return collect((array) $this->validated($prefix, []))
            ->map(fn (array $rule) => [
                'field' => $rule['field'],
                'operator' => $rule['operator'],
                'value' => match (true) {
                    $rule['field'] === 'skill' => ['skillId' => (int) $rule['value']['skillId'], 'minLevel' => (int) $rule['value']['minLevel']],
                    in_array($rule['operator'], ['in', 'not_in'], true) => array_values(array_map(fn ($item) => strtoupper(trim((string) $item)), $rule['value'])),
                    default => (float) $rule['value'],
                },
            ])
            ->values()
            ->all();
    }
}
