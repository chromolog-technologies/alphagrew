<?php

namespace App\Http\Requests\Exams;

use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;

class ListExamsRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Module permission (marks.view) is enforced by route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'semester_id' => ['nullable', 'integer', TenantRule::exists('semesters', 'id')],
            'subject_id' => ['nullable', 'integer', TenantRule::exists('subjects', 'id')],
        ];
    }
}
