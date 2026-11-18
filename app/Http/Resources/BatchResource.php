<?php

namespace App\Http\Resources;

use App\Models\Batch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Batch */
class BatchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'departmentCode' => $this->department_code,
            'courseId' => $this->course_id,
            'courseName' => $this->whenLoaded('course', fn () => $this->course?->name),
            'admissionYear' => $this->admission_year,
            'graduationYear' => $this->graduation_year,
            'status' => $this->status,
            'studentCount' => $this->whenCounted('students'),
        ];
    }
}
