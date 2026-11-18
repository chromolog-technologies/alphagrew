<?php

namespace App\Http\Requests\Students\Me;

use App\Models\StudentExperience;
use Illuminate\Validation\Rule;

class SaveStudentExperienceRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(StudentExperience::TYPES)],
            'organisation' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'startDate' => ['required', 'date', 'before_or_equal:today'],
            'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
            'description' => ['nullable', 'string', 'max:2000'],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:999'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $v = $this->validated();

        return [
            'type' => $v['type'],
            'organisation' => $v['organisation'],
            'role' => $v['role'],
            'start_date' => $v['startDate'],
            'end_date' => $v['endDate'] ?? null,
            'description' => $v['description'] ?? null,
            // Keep the current position on update unless a new one is sent.
            ...(isset($v['sortOrder']) ? ['sort_order' => $v['sortOrder']] : []),
        ];
    }
}
