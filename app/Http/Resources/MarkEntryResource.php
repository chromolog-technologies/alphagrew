<?php

namespace App\Http\Resources;

use App\Models\MarkEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MarkEntry
 */
class MarkEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'examId' => $this->exam_id,
            'subjectId' => $this->subject_id,
            'studentId' => $this->student_id,
            'exam' => $this->whenLoaded('exam', fn () => ['id' => $this->exam->id, 'name' => $this->exam->name, 'semesterId' => $this->exam->semester_id]),
            'subject' => $this->whenLoaded('subject', fn () => ['id' => $this->subject->id, 'code' => $this->subject->code, 'name' => $this->subject->name]),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'registrationNumber' => $this->student->registration_number,
            ]),
            'internalMarks' => $this->internal_marks,
            'externalMarks' => $this->external_marks,
            'extraMarks' => $this->extra_marks,
            'totalMarks' => $this->total_marks,
            'grade' => $this->grade,
            'gradePoint' => $this->grade_point,
            'result' => $this->result,
            'isAbsent' => $this->is_absent,
            'status' => $this->status?->value,
            'remarks' => $this->remarks,
            'enteredBy' => $this->entered_by,
            'submittedAt' => $this->submitted_at?->toIso8601String(),
            'verifiedBy' => $this->verified_by,
            'verifiedAt' => $this->verified_at?->toIso8601String(),
            'approvedBy' => $this->approved_by,
            'approvedAt' => $this->approved_at?->toIso8601String(),
            'lockedAt' => $this->locked_at?->toIso8601String(),
        ];
    }
}
