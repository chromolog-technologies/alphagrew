<?php

namespace App\Http\Requests\Skills;

use App\Support\Campus\SkillCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchSkillsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', Rule::in(SkillCatalog::CATEGORIES)],
            'limit' => ['nullable', 'integer', 'between:1,50'],
        ];
    }
}
