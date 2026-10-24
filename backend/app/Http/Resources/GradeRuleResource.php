<?php

namespace App\Http\Resources;

use App\Models\GradeRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GradeRule
 */
class GradeRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grade' => $this->grade,
            'gradePoint' => $this->grade_point,
            'minScore' => $this->min_score,
            'maxScore' => $this->max_score,
            'isPass' => $this->is_pass,
            'description' => $this->description,
            'sortOrder' => $this->sort_order,
        ];
    }
}
