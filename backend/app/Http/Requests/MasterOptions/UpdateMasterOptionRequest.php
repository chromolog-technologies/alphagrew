<?php

namespace App\Http\Requests\MasterOptions;

use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMasterOptionRequest extends FormRequest
{
    public function authorize(): Response
    {
        return StoreMasterOptionRequest::adminOnly($this->user()->isAdmin());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:1', 'max:999'],
        ];
    }
}
