<?php

namespace App\Http\Requests\CustomModules;

use App\Models\CustomModule;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Create or edit a custom module. The key is fixed once the module exists.
 */
class SaveCustomModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // custom_fields.manage is enforced by route middleware.
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->isCreating() && blank($this->input('key')) && filled($this->input('pluralLabel'))) {
            $key = Str::limit(Str::snake(Str::ascii((string) $this->input('pluralLabel'))), 40, '');
            $this->merge(['key' => preg_replace('/[^a-z0-9_]/', '', $key)]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $presence = $this->isCreating() ? 'required' : 'sometimes';

        return [
            ...($this->isCreating() ? [
                'key' => ['required', 'string', 'max:40', 'regex:/^[a-z][a-z0-9_]*$/', TenantRule::unique('custom_modules', 'key')],
            ] : []),
            'pluralLabel' => [$presence, 'string', 'max:100'],
            'singularLabel' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category' => [$presence, Rule::in(CustomModule::CATEGORIES)],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'viewRoles' => ['sometimes', 'array'],
            'viewRoles.*' => ['string', 'distinct', Rule::in(CustomModule::VIEWABLE_BY)],
            'editRoles' => ['sometimes', 'array'],
            'editRoles.*' => ['string', 'distinct', Rule::in(CustomModule::EDITABLE_BY)],
            'isActive' => ['sometimes', 'boolean'],
            'sortOrder' => ['sometimes', 'integer', 'min:0', 'max:65000'],
        ];
    }

    public function messages(): array
    {
        return [
            'key.regex' => 'The key may only contain lowercase letters, numbers and underscores, and must start with a letter.',
            'key.unique' => 'A module with this key already exists.',
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        $validated = $this->validated();
        $map = [
            'key' => 'key',
            'pluralLabel' => 'plural_label',
            'singularLabel' => 'singular_label',
            'category' => 'category',
            'description' => 'description',
            'viewRoles' => 'view_roles',
            'editRoles' => 'edit_roles',
            'isActive' => 'is_active',
            'sortOrder' => 'sort_order',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        foreach (['view_roles', 'edit_roles'] as $column) {
            if (array_key_exists($column, $attributes)) {
                $attributes[$column] = array_values($attributes[$column]);
            }
        }

        // The singular label defaults to the plural one.
        if (array_key_exists('singular_label', $attributes) && blank($attributes['singular_label'])) {
            $attributes['singular_label'] = $attributes['plural_label'] ?? $this->module()?->plural_label;
        } elseif ($this->isCreating() && ! isset($attributes['singular_label'])) {
            $attributes['singular_label'] = $attributes['plural_label'];
        }

        return $attributes;
    }

    private function isCreating(): bool
    {
        return $this->module() === null;
    }

    private function module(): ?CustomModule
    {
        $module = $this->route('customModule');

        return $module instanceof CustomModule ? $module : null;
    }
}
