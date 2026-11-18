<?php

namespace App\Http\Requests\Placement;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlacementPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->institution_id !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'oneOfferRule' => ['required', 'boolean'],
            'dreamOfferEnabled' => ['required', 'boolean'],
            'dreamOfferMinCtc' => ['nullable', 'required_if:dreamOfferEnabled,true', 'numeric', 'min:0', 'max:9999'],
            'offerResponseDays' => ['required', 'integer', 'between:1,60'],
            'maxActiveApplications' => ['nullable', 'integer', 'between:1,100'],
            'minProfileCompletion' => ['required', 'integer', 'between:0,100'],
            'debarOnRenege' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    public function attributesForModel(): array
    {
        $v = $this->validated();

        return [
            'one_offer_rule' => $v['oneOfferRule'],
            'dream_offer_enabled' => $v['dreamOfferEnabled'],
            'dream_offer_min_ctc' => $v['dreamOfferEnabled'] ? $v['dreamOfferMinCtc'] : null,
            'offer_response_days' => $v['offerResponseDays'],
            'max_active_applications' => $v['maxActiveApplications'] ?? null,
            'min_profile_completion' => $v['minProfileCompletion'],
            'debar_on_renege' => $v['debarOnRenege'],
        ];
    }
}
