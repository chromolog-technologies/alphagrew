<?php

namespace App\Http\Requests\Batches;

use App\Models\Batch;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => $this->filled('code') ? strtoupper(trim((string) $this->input('code'))) : null,
            'departmentCode' => $this->filled('departmentCode') ? strtoupper(trim((string) $this->input('departmentCode'))) : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Batch|null $batch */
        $batch = $this->route('batch');
        $admission = (int) $this->input('admissionYear');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9_-]+$/', TenantRule::unique('batches', 'code')->ignore($batch?->id)->whereNull('deleted_at')],
            'departmentCode' => ['nullable', 'string', 'max:20', TenantRule::exists('departments', 'code')],
            'courseId' => ['nullable', 'integer', TenantRule::exists('courses', 'id')],
            'admissionYear' => ['required', 'integer', 'between:2000,2100'],
            'graduationYear' => ['required', 'integer', 'gte:admissionYear', 'lte:'.($admission + 8)],
            'status' => ['sometimes', Rule::in(Batch::STATUSES)],
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        $validated = $this->validated();

        return [
            'name' => $validated['name'],
            'code' => $validated['code'],
            'department_code' => $validated['departmentCode'] ?? null,
            'course_id' => $validated['courseId'] ?? null,
            'admission_year' => $validated['admissionYear'],
            'graduation_year' => $validated['graduationYear'],
            // Left unchanged on update when not sent; new batches start active.
            ...(isset($validated['status']) ? ['status' => $validated['status']] : []),
        ];
    }
}
