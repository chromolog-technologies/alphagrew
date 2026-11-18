<?php

namespace App\Http\Resources;

use App\Models\StudentProject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentProject
 */
class StudentProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'techStack' => $this->tech_stack ?? [],
            'url' => $this->url,
            'startDate' => $this->start_date?->toDateString(),
            'endDate' => $this->end_date?->toDateString(),
            'sortOrder' => $this->sort_order,
        ];
    }
}
