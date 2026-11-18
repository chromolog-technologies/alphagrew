<?php

namespace App\Http\Resources;

use App\Models\StudentCertification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentCertification
 */
class StudentCertificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'issuer' => $this->issuer,
            'issuedOn' => $this->issued_on?->toDateString(),
            'expiresOn' => $this->expires_on?->toDateString(),
            'credentialUrl' => $this->credential_url,
            'sortOrder' => $this->sort_order,
        ];
    }
}
