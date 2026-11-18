<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlanVersion;
use App\Services\Owner\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Subscription plans & feature entitlements (SRS §5.6).
 */
class OwnerPlanController extends Controller
{
    public function __construct(private readonly PlanService $plans)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Plan::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $items = Plan::query()
            ->with(['currentVersion', 'versions'])
            ->withCount(['subscriptions', 'subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trial', 'active'])])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->where(fn ($sub) => $sub->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%")))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $items->map(fn (Plan $plan) => $this->presentPlan($plan))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(creating: true));
        $plan = $this->plans->create($data, $request->user());

        return response()->json(['data' => $this->presentPlan($plan->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count']))], 201);
    }

    public function show(Plan $plan): JsonResponse
    {
        $plan->load(['currentVersion', 'versions'])->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trial', 'active'])]);

        return response()->json(['data' => $this->presentPlan($plan, includeHistory: true)]);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $data = $request->validate($this->rules(creating: false));
        $updated = $this->plans->update($plan, $data, $request->user());
        $updated->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trial', 'active'])]);

        return response()->json(['data' => $this->presentPlan($updated, includeHistory: true)]);
    }

    public function clonePlan(Request $request, Plan $plan): JsonResponse
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash', 'unique:plans,code'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $cloned = $this->plans->clonePlan($plan, $data, $request->user());
        $cloned->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count']);

        return response()->json(['data' => $this->presentPlan($cloned)], 201);
    }

    public function publish(Request $request, Plan $plan): JsonResponse
    {
        $published = $this->plans->publish($plan, $request->user());
        $published->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trial', 'active'])]);

        return response()->json(['data' => $this->presentPlan($published)]);
    }

    public function archive(Request $request, Plan $plan): JsonResponse
    {
        $archived = $this->plans->archive($plan, $request->user());
        $archived->loadCount(['subscriptions', 'subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trial', 'active'])]);

        return response()->json(['data' => $this->presentPlan($archived)]);
    }

    public function destroy(Request $request, Plan $plan): JsonResponse
    {
        $this->plans->delete($plan, $request->user());

        return response()->json(['message' => 'Plan deleted.']);
    }

    /** @return array<string, mixed> */
    private function rules(bool $creating): array
    {
        $req = $creating ? ['required'] : ['sometimes', 'required'];

        return [
            ...($creating ? ['code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:plans,code']] : []),
            'name' => [...$req, 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', Rule::in(Plan::STATUSES)],
            'sortOrder' => ['sometimes', 'integer', 'between:0,9999'],
            'isPublic' => ['sometimes', 'boolean'],
            'billingCycle' => ['sometimes', Rule::in(PlanVersion::BILLING_CYCLES)],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999'],
            'setupFee' => ['sometimes', 'numeric', 'min:0', 'max:99999999'],
            'currency' => ['sometimes', 'string', 'size:3', 'regex:/^[A-Za-z]{3}$/'],
            'trialDays' => ['sometimes', 'integer', 'between:0,365'],
            'studentLimit' => ['nullable', 'integer', 'min:0'],
            'facultyLimit' => ['nullable', 'integer', 'min:0'],
            'campusLimit' => ['nullable', 'integer', 'min:0'],
            'departmentLimit' => ['nullable', 'integer', 'min:0'],
            'recruiterLimit' => ['nullable', 'integer', 'min:0'],
            'storageLimitMb' => ['sometimes', 'integer', 'min:0'],
            'apiRequestsLimit' => ['nullable', 'integer', 'min:0'],
            'aiCreditAllocation' => ['sometimes', 'numeric', 'min:0'],
            'aiCreditResetPeriod' => ['sometimes', Rule::in(PlanVersion::CREDIT_RESET_PERIODS)],
            'features' => ['sometimes', 'array'],
            'features.*' => ['boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function presentPlan(Plan $plan, bool $includeHistory = false): array
    {
        $v = $plan->currentVersion;

        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'status' => $plan->status,
            'sortOrder' => $plan->sort_order,
            'isPublic' => $plan->is_public,
            'subscriptionsCount' => (int) ($plan->subscriptions_count ?? 0),
            'activeSubscriptionsCount' => (int) ($plan->active_subscriptions_count ?? 0),
            'currentVersion' => $v ? $this->presentVersion($v) : null,
            ...($includeHistory ? ['versions' => $plan->versions->map(fn (PlanVersion $ver) => $this->presentVersion($ver))->values()] : []),
            'updatedAt' => $plan->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentVersion(PlanVersion $v): array
    {
        return [
            'id' => $v->id,
            'versionNumber' => $v->version_number,
            'billingCycle' => $v->billing_cycle,
            'price' => $v->price,
            'setupFee' => $v->setup_fee,
            'currency' => $v->currency,
            'trialDays' => $v->trial_days,
            'studentLimit' => $v->student_limit,
            'facultyLimit' => $v->faculty_limit,
            'campusLimit' => $v->campus_limit,
            'departmentLimit' => $v->department_limit,
            'recruiterLimit' => $v->recruiter_limit,
            'storageLimitMb' => $v->storage_limit_mb,
            'apiRequestsLimit' => $v->api_requests_limit,
            'aiCreditAllocation' => $v->ai_credit_allocation,
            'aiCreditResetPeriod' => $v->ai_credit_reset_period,
            'features' => $v->features ?? [],
            'isCurrent' => $v->is_current,
            'publishedAt' => $v->published_at?->toIso8601String(),
        ];
    }
}

