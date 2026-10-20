<?php

namespace App\Http\Resources;

use App\Models\AiRecommendation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiRecommendation
 */
class AiRecommendationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'detail' => $this->detail,
            'skill' => $this->skill,
            'action' => $this->action,
            'priority' => $this->priority,
            'status' => $this->status,
            'sourceType' => $this->source_type,
            'sourceId' => $this->source_id,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
