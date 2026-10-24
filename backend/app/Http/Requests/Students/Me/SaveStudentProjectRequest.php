<?php

namespace App\Http\Requests\Students\Me;

class SaveStudentProjectRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'techStack' => ['nullable', 'array', 'max:15'],
            'techStack.*' => ['string', 'max:50'],
            'url' => ['nullable', 'url', 'max:255'],
            'startDate' => ['nullable', 'date'],
            'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
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
            'title' => $v['title'],
            'description' => $v['description'] ?? null,
            'tech_stack' => $v['techStack'] ?? [],
            'url' => $v['url'] ?? null,
            'start_date' => $v['startDate'] ?? null,
            'end_date' => $v['endDate'] ?? null,
            // Keep the current position on update unless a new one is sent.
            ...(isset($v['sortOrder']) ? ['sort_order' => $v['sortOrder']] : []),
        ];
    }
}
