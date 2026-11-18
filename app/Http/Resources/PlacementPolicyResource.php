<?php

namespace App\Http\Resources;

use App\Models\PlacementPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PlacementPolicy */
class PlacementPolicyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'oneOfferRule' => $this->one_offer_rule,
            'dreamOfferEnabled' => $this->dream_offer_enabled,
            'dreamOfferMinCtc' => $this->dream_offer_min_ctc !== null ? (float) $this->dream_offer_min_ctc : null,
            'offerResponseDays' => $this->offer_response_days,
            'maxActiveApplications' => $this->max_active_applications,
            'minProfileCompletion' => $this->min_profile_completion,
            'debarOnRenege' => $this->debar_on_renege,
            'isDefault' => ! $this->exists,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
