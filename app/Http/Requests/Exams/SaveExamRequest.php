<?php

namespace App\Http\Requests\Exams;

use App\Models\CustomFieldDefinition;
use App\Models\Exam;
use App\Services\CustomFields\CustomFieldService;
use App\Support\Tenancy\TenantRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create or edit a scheduled exam. Authorisation (exams.create / exams.edit, or marks.publish
 * for exam coordinators) is checked in ExamController.
 */
class SaveExamRequest extends FormRequest
{
    public const MODES = ['offline', 'online', 'hybrid'];

    public const STATUSES = ['scheduled', 'conducted', 'cancelled', 'postponed'];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $creating = $this->exam() === null;
        $presence = $creating ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'subjectId' => [$presence, 'integer', TenantRule::exists('subjects', 'id')->whereNull('deleted_at')],
            'semesterId' => [$presence, 'integer', TenantRule::exists('semesters', 'id')->whereNull('deleted_at')],
            // Exam types are shared by all institutions.
            'examTypeId' => [$presence, 'integer', Rule::exists('exam_types', 'id')->whereNull('deleted_at')],
            'examDate' => [$presence, 'date'],
            // Times change together, so the end can always be checked against the start.
            'startTime' => [$presence, 'required_with:endTime', 'date_format:H:i'],
            'endTime' => [$presence, 'required_with:startTime', 'date_format:H:i', 'after:startTime'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'maxMarks' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'examMode' => ['sometimes', Rule::in(self::MODES)],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            ...app(CustomFieldService::class)->rules(CustomFieldDefinition::ENTITY_EXAM, $creating),
        ];
    }

    public function attributes(): array
    {
        return app(CustomFieldService::class)->attributes(CustomFieldDefinition::ENTITY_EXAM);
    }

    public function messages(): array
    {
        return ['endTime.after' => 'The end time must be after the start time.'];
    }

    /**
     * Validated input as exam columns. The duration follows from the start and end times.
     *
     * @return array<string, mixed>
     */
    public function examAttributes(): array
    {
        $v = $this->validated();
        $map = [
            'name' => 'name', 'subjectId' => 'subject_id', 'semesterId' => 'semester_id', 'examTypeId' => 'exam_type_id',
            'examDate' => 'exam_date', 'startTime' => 'start_time', 'endTime' => 'end_time', 'location' => 'location',
            'maxMarks' => 'max_marks', 'examMode' => 'exam_mode', 'status' => 'status',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $v)) {
                $attributes[$column] = $v[$input];
            }
        }

        $start = $attributes['start_time'] ?? $this->exam()?->getRawOriginal('start_time');
        $end = $attributes['end_time'] ?? $this->exam()?->getRawOriginal('end_time');
        if ($start && $end && (isset($attributes['start_time']) || isset($attributes['end_time']))) {
            $attributes['duration_minutes'] = (int) ((strtotime($end) - strtotime($start)) / 60);
        }

        return $attributes;
    }

    /** @return array<string, mixed> */
    public function customFields(): array
    {
        return $this->validated('customFields') ?? [];
    }

    public function exam(): ?Exam
    {
        $exam = $this->route('exam');

        return $exam instanceof Exam ? $exam : null;
    }
}
