<?php

namespace App\Http\Requests\CustomModules;

use App\Models\CustomModule;
use App\Models\CustomModuleRecord;
use App\Services\CustomFields\CustomFieldService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create or edit a record of a custom module: its title, status and custom field values.
 */
class SaveCustomModuleRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->module()->canEdit($this->user());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $creating = $this->route('record') === null;

        return [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(CustomModuleRecord::STATUSES)],
            ...$this->fields()->rules($this->module()->customFieldEntity(), $creating),
        ];
    }

    public function attributes(): array
    {
        return $this->fields()->attributes($this->module()->customFieldEntity());
    }

    /** @return array<string, mixed> */
    public function customFields(): array
    {
        return $this->validated('customFields') ?? [];
    }

    public function module(): CustomModule
    {
        return $this->route('customModule');
    }

    private function fields(): CustomFieldService
    {
        return app(CustomFieldService::class);
    }
}
