<?php

namespace App\Http\Requests\CustomFields;

use App\Models\CustomFieldDefinition;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Create or edit a custom field. The entity and key are fixed once the field exists,
 * because stored values and dashboard widgets refer to them.
 */
class SaveCustomFieldDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // custom_fields.manage is enforced by route middleware.
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->isCreating() && blank($this->input('key')) && filled($this->input('label'))) {
            $this->merge(['key' => Str::limit(Str::snake(Str::ascii((string) $this->input('label'))), 50, '')]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $type = $this->isCreating() ? $this->input('type') : ($this->input('type') ?? $this->definition()?->type);

        return [
            ...($this->isCreating() ? [
                'entity' => ['required', 'string', function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! CustomFieldDefinition::isKnownEntity($value)) {
                        $fail('The selected record type is invalid.');
                    }
                }],
                'key' => [
                    'required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/',
                    TenantRule::unique('custom_field_definitions', 'key')->where('entity', $this->input('entity')),
                ],
            ] : []),
            'label' => [$this->isCreating() ? 'required' : 'sometimes', 'string', 'max:100'],
            'type' => [$this->isCreating() ? 'required' : 'sometimes', Rule::in(CustomFieldDefinition::TYPES)],
            'options' => [
                Rule::requiredIf(in_array($type, [CustomFieldDefinition::TYPE_SELECT, CustomFieldDefinition::TYPE_MULTISELECT], true)),
                'nullable', 'array', 'max:100',
            ],
            'options.*' => ['required', 'string', 'max:100', 'distinct'],
            'helpText' => ['sometimes', 'nullable', 'string', 'max:255'],
            'isRequired' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
            'sortOrder' => ['sometimes', 'integer', 'min:0', 'max:65000'],
        ];
    }

    public function messages(): array
    {
        return [
            'key.regex' => 'The key may only contain lowercase letters, numbers and underscores, and must start with a letter.',
            'key.unique' => 'A field with this key already exists for this record type.',
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        $validated = $this->validated();
        $map = [
            'entity' => 'entity',
            'key' => 'key',
            'label' => 'label',
            'type' => 'type',
            'helpText' => 'help_text',
            'isRequired' => 'is_required',
            'isActive' => 'is_active',
            'sortOrder' => 'sort_order',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        $type = $attributes['type'] ?? $this->definition()?->type;
        if (in_array($type, [CustomFieldDefinition::TYPE_SELECT, CustomFieldDefinition::TYPE_MULTISELECT], true)) {
            if (array_key_exists('options', $validated)) {
                $attributes['options'] = array_values($validated['options'] ?? []);
            }
        } else {
            $attributes['options'] = null;
        }

        return $attributes;
    }

    private function isCreating(): bool
    {
        return $this->definition() === null;
    }

    private function definition(): ?CustomFieldDefinition
    {
        $definition = $this->route('customField');

        return $definition instanceof CustomFieldDefinition ? $definition : null;
    }
}
