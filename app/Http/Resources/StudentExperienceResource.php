<?php

namespace App\Http\Resources;

use App\Models\StudentExperience;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentExperience
 */
class StudentExperienceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'organisation' => $this->organisation,
            'role' => $this->role,
            'startDate' => $this->start_date?->toDateString(),
            'endDate' => $this->end_date?->toDateString(),
            'description' => $this->description,
            'sortOrder' => $this->sort_order,
        ];
    }
}
