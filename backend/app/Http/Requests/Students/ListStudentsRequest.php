<?php

namespace App\Http\Requests\Students;

use Illuminate\Foundation\Http\FormRequest;

class ListStudentsRequest extends FormRequest
{
    public const DEFAULT_PER_PAGE = 25;

    public function authorize(): bool
    {
        // Module permission (students.view) is enforced by route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? self::DEFAULT_PER_PAGE);
    }
}
