<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Placement\UpdatePlacementPolicyRequest;
use App\Http\Resources\PlacementPolicyResource;
use App\Models\PlacementPolicy;
use App\Services\Audit\AuditLogger;

/**
 * The institution's placement policy (plan S2-5): one-offer and dream-offer rules,
 * offer response window, application cap, profile minimum, renege debarment.
 */
class PlacementPolicyController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function show(): PlacementPolicyResource
    {
        return new PlacementPolicyResource(PlacementPolicy::current());
    }

    public function update(UpdatePlacementPolicyRequest $request): PlacementPolicyResource
    {
        $policy = PlacementPolicy::current();
        $before = $policy->exists ? $policy->only(array_keys(PlacementPolicy::DEFAULTS)) : [];

        $policy->fill([...$request->attributesForModel(), 'updated_by' => $request->user()->id])->save();
        $this->audit->record('placement.policy_updated', $policy, $before, $policy->only(array_keys(PlacementPolicy::DEFAULTS)));

        return new PlacementPolicyResource($policy->fresh());
    }
}
