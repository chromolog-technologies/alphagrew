<?php

namespace App\Http\Resources;

use App\Models\ResultPublishingLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ResultPublishingLog
 */
class ResultPublishingLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'semesterId' => $this->semester_id,
            'semester' => $this->whenLoaded('semester', fn () => $this->semester?->name),
            'action' => $this->action,
            'publishedBy' => $this->whenLoaded('publishedBy', fn () => [
                'id' => $this->publishedBy?->id,
                'name' => $this->publishedBy?->name,
            ]),
            'studentsCount' => $this->total_students,
            'entriesCount' => $this->entries_count,
            'ipAddress' => $this->ip_address,
            'reason' => $this->reason,
            'details' => $this->details,
            'createdAt' => ($this->published_at ?? $this->created_at)?->toIso8601String(),
        ];
    }
}
