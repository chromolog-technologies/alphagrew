<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\PlanVersion;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Services\Owner\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Institution subscriptions, trials, upgrades, pauses, extensions and cancellations (SRS §5.7).
 */
class OwnerSubscriptionController extends Controller
{
    public function __construct(private readonly SubscriptionService $subscriptions)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Subscription::STATUSES)],
            'institutionId' => ['nullable', 'integer'],
            'planId' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $page = Subscription::query()
            ->with(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion:id,version_number,billing_cycle'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['institutionId'] ?? null, fn ($q, int $id) => $q->where('institution_id', $id))
            ->when($filters['planId'] ?? null, fn ($q, int $id) => $q->where('plan_id', $id))
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->whereHas('institution', fn ($iq) => $iq->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%")))
            ->latest('id')
            ->paginate($filters['perPage'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (Subscription $sub) => $this->present($sub)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionId' => ['required', 'integer', 'exists:institutions,id'],
            'planId' => ['required', 'integer', 'exists:plans,id'],
            'planVersionId' => ['nullable', 'integer', 'exists:plan_versions,id'],
            'status' => ['sometimes', Rule::in(['trial', 'active'])],
            'billingCycle' => ['sometimes', Rule::in(PlanVersion::BILLING_CYCLES)],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'trialDays' => ['sometimes', 'integer', 'between:1,365'],
            'graceDays' => ['sometimes', 'integer', 'between:0,90'],
            'expiryBehavior' => ['sometimes', Rule::in(Subscription::EXPIRY_BEHAVIORS)],
            'autoRenew' => ['sometimes', 'boolean'],
            'generateInvoice' => ['sometimes', 'boolean'],
            'startAt' => ['nullable', 'date'],
        ]);

        $sub = $this->subscriptions->assign($data, $request->user());

        return response()->json(['data' => $this->present($sub, includeEvents: true)], 201);
    }

    public function show(Subscription $subscription): JsonResponse
    {
        $subscription->load(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);

        return response()->json(['data' => $this->present($subscription, includeEvents: true)]);
    }

    public function changePlan(Request $request, Subscription $subscription): JsonResponse
    {
        $data = $request->validate([
            'planId' => ['required', 'integer', 'exists:plans,id'],
            'reason' => ['nullable', 'string', 'max:500'],
            'generateInvoice' => ['sometimes', 'boolean'],
        ]);

        $updated = $this->subscriptions->changePlan(
            $subscription,
            (int) $data['planId'],
            $data['reason'] ?? 'Plan updated',
            $request->user(),
            (bool) ($data['generateInvoice'] ?? false),
        );

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function renew(Request $request, Subscription $subscription): JsonResponse
    {
        $generateInvoice = (bool) ($request->validate(['generateInvoice' => ['sometimes', 'boolean']])['generateInvoice'] ?? true);
        $updated = $this->subscriptions->renew($subscription, $request->user(), $generateInvoice);

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function pause(Request $request, Subscription $subscription): JsonResponse
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:500']])['reason'];
        $updated = $this->subscriptions->pause($subscription, $reason, $request->user());

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function resume(Request $request, Subscription $subscription): JsonResponse
    {
        $updated = $this->subscriptions->resume($subscription, $request->user());

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function extend(Request $request, Subscription $subscription): JsonResponse
    {
        $data = $request->validate([
            'days' => ['required', 'integer', 'between:1,365'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $updated = $this->subscriptions->extend($subscription, (int) $data['days'], $data['reason'], $request->user());

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function cancel(Request $request, Subscription $subscription): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'immediate' => ['sometimes', 'boolean'],
        ]);
        $updated = $this->subscriptions->cancel($subscription, $data['reason'], $request->user(), (bool) ($data['immediate'] ?? false));

        return response()->json(['data' => $this->present($updated, includeEvents: true)]);
    }

    public function events(Subscription $subscription): JsonResponse
    {
        $events = $subscription->events()->with('actor:id,name')->get();

        return response()->json(['data' => $events->map(fn (SubscriptionEvent $e) => [
            'id' => $e->id,
            'eventType' => $e->event_type,
            'fromStatus' => $e->from_status,
            'toStatus' => $e->to_status,
            'fromPlanVersionId' => $e->from_plan_version_id,
            'toPlanVersionId' => $e->to_plan_version_id,
            'reason' => $e->reason,
            'actor' => $e->actor?->name,
            'at' => $e->created_at?->toIso8601String(),
        ])]);
    }

    /** @return array<string, mixed> */
    private function present(Subscription $sub, bool $includeEvents = false): array
    {
        return [
            'id' => $sub->id,
            'institution' => $sub->institution ? [
                'id' => $sub->institution->id,
                'name' => $sub->institution->name,
                'code' => $sub->institution->code,
                'status' => $sub->institution->status,
            ] : null,
            'plan' => $sub->plan ? [
                'id' => $sub->plan->id,
                'code' => $sub->plan->code,
                'name' => $sub->plan->name,
            ] : null,
            'planVersionId' => $sub->plan_version_id,
            'planVersionNumber' => $sub->planVersion?->version_number ?? ($sub->entitlement_snapshot['versionNumber'] ?? null),
            'status' => $sub->status,
            'billingCycle' => $sub->billing_cycle,
            'amount' => $sub->amount,
            'currency' => $sub->currency,
            'mrr' => $sub->monthlyRecurringValue(),
            'startAt' => $sub->start_at?->toIso8601String(),
            'endAt' => $sub->end_at?->toIso8601String(),
            'trialStartAt' => $sub->trial_start_at?->toIso8601String(),
            'trialEndAt' => $sub->trial_end_at?->toIso8601String(),
            'renewalAt' => $sub->renewal_at?->toIso8601String(),
            'graceEndsAt' => $sub->grace_ends_at?->toIso8601String(),
            'graceDays' => $sub->grace_days,
            'expiryBehavior' => $sub->expiry_behavior,
            'autoRenew' => $sub->auto_renew,
            'cancelReason' => $sub->cancel_reason,
            'cancelledAt' => $sub->cancelled_at?->toIso8601String(),
            'pausedAt' => $sub->paused_at?->toIso8601String(),
            'entitlementSnapshot' => $sub->entitlement_snapshot,
            ...($includeEvents ? ['events' => $sub->events->map(fn (SubscriptionEvent $e) => [
                'id' => $e->id,
                'eventType' => $e->event_type,
                'fromStatus' => $e->from_status,
                'toStatus' => $e->to_status,
                'reason' => $e->reason,
                'actor' => $e->actor?->name,
                'at' => $e->created_at?->toIso8601String(),
            ])->values()] : []),
        ];
    }
}

