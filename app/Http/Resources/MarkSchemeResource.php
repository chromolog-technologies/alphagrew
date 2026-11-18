<?php

namespace App\Http\Resources;

use App\Models\MarkScheme;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MarkScheme
 */
class MarkSchemeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subjectId' => $this->subject_id,
            'semesterId' => $this->semester_id,
            'subject' => $this->whenLoaded('subject', fn () => ['id' => $this->subject->id, 'code' => $this->subject->code, 'name' => $this->subject->name]),
            'semester' => $this->whenLoaded('semester', fn () => ['id' => $this->semester->id, 'name' => $this->semester->name]),
            'internalMax' => $this->internal_max,
            'externalMax' => $this->external_max,
            'totalMax' => $this->total_max,
            'internalPass' => $this->internal_pass,
            'externalPass' => $this->external_pass,
            'totalPass' => $this->total_pass,
            'extraMarksAllowed' => (float) $this->extra_marks_allowed,
            'isActive' => $this->is_active,
        ];
    }
}
