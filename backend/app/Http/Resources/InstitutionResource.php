<?php

namespace App\Http\Resources;

use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * The institution profile and branding, readable by every member of the institution.
 *
 * @mixin Institution
 */
class InstitutionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $settings = $this->settings ?? [];
        $logoPath = $settings['logoPath'] ?? null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'logoUrl' => $logoPath ? Storage::disk('public')->url($logoPath) : null,
            'primaryColor' => $settings['primaryColor'] ?? null,
            'accentColor' => $settings['accentColor'] ?? null,
            'contactEmail' => $settings['contactEmail'] ?? null,
            'contactPhone' => $settings['contactPhone'] ?? null,
            'website' => $settings['website'] ?? null,
            'address' => $settings['address'] ?? null,
            'emailSenderName' => $settings['emailSenderName'] ?? null,
            'emailReplyTo' => $settings['emailReplyTo'] ?? null,
        ];
    }
}
