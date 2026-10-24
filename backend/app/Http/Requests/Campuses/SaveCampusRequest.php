<?php

namespace App\Http\Requests\Campuses;

use App\Models\Campus;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveCampusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => strtoupper(trim((string) $this->input('code')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Campus|null $campus */
        $campus = $this->route('campus');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Z0-9_-]+$/', TenantRule::unique('campuses', 'code')->ignore($campus?->id)->whereNull('deleted_at')],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'isPrimary' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        $validated = $this->validated();

        return [
            'name' => $validated['name'],
            'code' => $validated['code'],
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'phone' => $validated['phone'] ?? null,
        ];
    }
}
