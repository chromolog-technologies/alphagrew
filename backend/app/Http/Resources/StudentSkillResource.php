<?php

namespace App\Http\Resources;

use App\Models\StudentSkill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentSkill
 */
class StudentSkillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'skillId' => $this->skill_id,
            'name' => $this->skill?->name,
            'category' => $this->skill?->category,
            'level' => $this->level,
            'verifiedLevel' => $this->verified_level,
            'source' => $this->source,
        ];
    }
}
