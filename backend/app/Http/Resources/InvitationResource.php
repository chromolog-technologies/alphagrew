<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Invitation */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'departmentCode' => $this->department_code,
            'designationId' => $this->designation_id,
            'designationName' => $this->whenLoaded('designation', fn () => $this->designation?->name),
            'status' => $this->status(),
            'invitedBy' => $this->whenLoaded('inviter', fn () => $this->inviter?->name),
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'acceptedAt' => $this->accepted_at?->toIso8601String(),
            'revokedAt' => $this->revoked_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
