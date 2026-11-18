<?php

namespace App\Http\Requests\Marks;

/**
 * GET /result-publishing/logs
 */
class PublishingLogsRequest extends MarksStaffRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'semesterId' => ['nullable', 'integer'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:200'],
        ];
    }
}
