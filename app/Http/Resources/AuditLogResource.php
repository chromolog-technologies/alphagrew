<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin AuditLog */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'actorId' => $this->actor_id,
            'actorName' => $this->whenLoaded('actor', fn () => $this->actor?->name),
            'subjectType' => $this->subject_type ? Str::afterLast($this->subject_type, '\\') : null,
            'subjectId' => $this->subject_id,
            'oldValues' => $this->old_values,
            'newValues' => $this->new_values,
            'ipAddress' => $this->ip_address,
            'userAgent' => $this->user_agent,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
