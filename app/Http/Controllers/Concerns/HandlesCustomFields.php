<?php

namespace App\Http\Controllers\Concerns;

use App\Services\CustomFields\CustomFieldService;
use Illuminate\Http\Request;

/**
 * Custom field values on a record's own create/update endpoints: validated together with the
 * record's fields (so every error comes back at once, and required fields are enforced on
 * create), then saved in the same transaction as the record.
 */
trait HandlesCustomFields
{
    /**
     * @param  array<string, mixed>  $rules  The record's own validation rules.
     * @return array{0: array<string, mixed>, 1: array<string, mixed>} [record attributes, custom field values]
     */
    protected function validateWithCustomFields(Request $request, array $rules, string $entity, bool $creating): array
    {
        $fields = $this->customFieldService();
        $validated = $request->validate(
            [...$rules, ...$fields->rules($entity, $creating)],
            [],
            $fields->attributes($entity),
        );

        $customFields = $validated['customFields'] ?? [];
        unset($validated['customFields']);

        return [$validated, $customFields];
    }

    protected function customFieldService(): CustomFieldService
    {
        return app(CustomFieldService::class);
    }
}
