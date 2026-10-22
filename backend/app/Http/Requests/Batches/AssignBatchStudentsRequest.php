<?php

namespace App\Http\Requests\Batches;

use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;

class AssignBatchStudentsRequest extends FormRequest
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
            'studentIds' => ['required', 'array', 'min:1', 'max:500'],
            'studentIds.*' => ['integer', 'distinct', TenantRule::exists('students', 'id')->whereNull('deleted_at')],
        ];
    }
}
