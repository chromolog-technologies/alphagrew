<?php

namespace App\Http\Resources;

use App\Models\StudentAcademic;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentAcademic
 */
class EducationRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'boardOrUniversity' => $this->board_or_university,
            'institutionName' => $this->institution_name,
            'yearOfPassing' => $this->year_of_passing,
            'scoreType' => $this->score_type,
            'score' => $this->score,
            'verified' => $this->isVerified(),
            'verifiedAt' => $this->verified_at?->toIso8601String(),
            'verificationRemarks' => $this->verification_remarks,
        ];
    }
}
