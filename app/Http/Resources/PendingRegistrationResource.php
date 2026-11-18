<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A self-registered student account, for the approval queue.
 *
 * @mixin User
 */
class PendingRegistrationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'departmentCode' => $this->department_code,
            'studentId' => $this->student?->id,
            'registrationNumber' => $this->student?->registration_number,
            'status' => $this->statusEnum()->value,
            'statusReason' => $this->status_reason,
            'emailVerified' => $this->hasVerifiedEmail(),
            'registeredAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
