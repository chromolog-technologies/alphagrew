<?php

namespace App\Http\Requests\MasterOptions;

use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMasterOptionRequest extends FormRequest
{
    public function authorize(): Response
    {
        return self::adminOnly($this->user()->isAdmin());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(CampusMasterCatalog::allowedCategories())],
            'label' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:1', 'max:999'],
        ];
    }

    public static function adminOnly(bool $isAdmin): Response
    {
        return $isAdmin ? Response::allow() : Response::deny('Only admins can manage campus masters.');
    }
}
