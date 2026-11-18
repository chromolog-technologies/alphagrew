<?php

namespace App\Services\Owner;

use App\Models\Institution;
use App\Models\Plan;
use App\Models\PlanVersion;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Subscription lifecycle, entitlement snapshots, trial conversions and commercial sync (SRS §5.7).
 */
class SubscriptionService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly AiCreditService $credits,
        private readonly BillingService $billing,
    ) {
    }

    /** @param array<string, mixed> $data */
    public function assign(array $data, User $actor): Subscription
    {
        return DB::transaction(function () use ($data, $actor): Subscription {
            $institution = Institution::query()->findOrFail((int) $data['institutionId']);
            $plan = Plan::query()->findOrFail((int) $data['planId']);
            $version = isset($data['planVersionId'])
                ? PlanVersion::query()->where('plan_id', $plan->id)->findOrFail((int) $data['planVersionId'])
                : $plan->currentVersion;

            if (! $version) {
                throw ValidationException::withMessages(['planId' => ['Selected plan has no active version configured.']]);
            }
            if ($plan->status === 'archived') {
                throw ValidationException::withMessages(['planId' => ['Archived plans cannot be assigned to new subscriptions.']]);
            }

            $version->setRelation('plan', $plan);
            $startAt = Carbon::parse($data['startAt'] ?? now());
            $mode = $data['status'] ?? ($version->trial_days > 0 ? 'trial' : 'active');
            $trialDays = (int) ($data['trialDays'] ?? $version->trial_days);
            $cycle = $data['billingCycle'] ?? $version->billing_cycle;
            $amount = round((float) ($data['amount'] ?? $version->price), 2);
            $currency = strtoupper((string) ($data['currency'] ?? $version->currency));

            // Close out any prior live subscription cleanly on reassignment.
            Subscription::query()
                ->where('institution_id', $institution->id)
                ->whereIn('status', ['trial', 'active', 'past_due', 'paused'])
                ->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancel_reason' => 'Replaced by new subscription assignment']);

            $trialStart = $mode === 'trial' ? $startAt->copy() : null;
            $trialEnd = $mode === 'trial' ? $startAt->copy()->addDays(max(1, $trialDays))->endOfDay() : null;
            $endAt = $mode === 'trial'
                ? $trialEnd->copy()
                : $this->cycleEndDate($startAt, $cycle);

            $subscription = Subscription::query()->create([
                'institution_id' => $institution->id,
                'plan_id' => $plan->id,
                'plan_version_id' => $version->id,
                'status' => $mode,
                'billing_cycle' => $cycle,
                'amount' => $amount,
                'currency' => $currency,
                'start_at' => $startAt,
                'end_at' => $endAt,
                'trial_start_at' => $trialStart,
                'trial_end_at' => $trialEnd,
                'renewal_at' => $endAt,
                'grace_days' => (int) ($data['graceDays'] ?? 7),
                'expiry_behavior' => $data['expiryBehavior'] ?? 'grace_then_readonly',
                'auto_renew' => (bool) ($data['autoRenew'] ?? true),
                'entitlement_snapshot' => $version->toEntitlementSnapshot(),
                'created_by' => $actor->id,
            ]);

            if ($mode === 'trial' && in_array($institution->status, ['prospect', 'trial', 'expired'], true)) {
                $institution->update(['status' => 'trial', 'trial_ends_at' => $trialEnd]);
            } elseif ($mode === 'active' && in_array($institution->status, ['prospect', 'trial', 'expired'], true)) {
                $institution->update(['status' => 'active', 'trial_ends_at' => null]);
            }

            if ($version->ai_credit_allocation > 0) {
                $this->credits->postTransaction(
                    institutionId: $institution->id,
                    type: 'plan_allocation',
                    delta: (float) $version->ai_credit_allocation,
                    actor: $actor,
                    reason: "Initial credits for {$plan->name} (v{$version->version_number})",
                    sourceType: Subscription::class,
                    sourceId: $subscription->id,
                    idempotencyKey: "sub_init_{$subscription->id}",
                );
            }

            if ($mode === 'active' && ($data['generateInvoice'] ?? true) && $amount > 0) {
                $items = [[
                    'description' => "{$plan->name} ({$cycle}) subscription",
                    'quantity' => 1,
                    'unitPrice' => $amount,
                    'itemType' => 'subscription',
                ]];
                if ($version->setup_fee > 0) {
                    $items[] = [
                        'description' => "{$plan->name} one-time setup fee",
                        'quantity' => 1,
                        'unitPrice' => $version->setup_fee,
                        'itemType' => 'setup_fee',
                    ];
                }
                $this->billing->createInvoice([
                    'institutionId' => $institution->id,
                    'subscriptionId' => $subscription->id,
                    'currency' => $currency,
                    'billingPeriodStart' => $startAt->toDateString(),
                    'billingPeriodEnd' => $endAt->toDateString(),
                    'items' => $items,
                ], $actor);
            }

            $this->recordEvent($subscription, 'created', null, $version->id, null, $mode, 'Subscription assigned', $actor);
            $this->audit->record('owner.subscription_created', $subscription, [], [
                'plan' => $plan->code,
                'version' => $version->version_number,
                'status' => $mode,
                'amount' => $amount,
            ], $actor, $institution->id);

            return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
        });
    }

    /** Upgrades or downgrades an existing subscription to another plan / latest version (FR-SUB-003). */
    public function changePlan(Subscription $subscription, int $targetPlanId, ?string $reason, User $actor, bool $generateInvoice = false): Subscription
    {
        if (in_array($subscription->status, ['cancelled', 'expired'], true)) {
            throw ValidationException::withMessages(['status' => ['Cancelled or expired subscriptions cannot change plans; assign a new subscription.']]);
        }

        return DB::transaction(function () use ($subscription, $targetPlanId, $reason, $actor, $generateInvoice): Subscription {
            $targetPlan = Plan::query()->findOrFail($targetPlanId);
            $newVersion = $targetPlan->currentVersion;
            if (! $newVersion || $targetPlan->status === 'archived') {
                throw ValidationException::withMessages(['planId' => ['Target plan must be active and have a current version.']]);
            }

            $newVersion->setRelation('plan', $targetPlan);
            $fromVersionId = $subscription->plan_version_id;
            $fromAmount = $subscription->amount;
            $eventType = $newVersion->price >= $fromAmount ? 'upgraded' : 'downgraded';

            $previousCredits = (float) ($subscription->entitlement_snapshot['limits']['aiCredits'] ?? 0);
            $nextCredits = (float) $newVersion->ai_credit_allocation;
            $creditDiff = round($nextCredits - $previousCredits, 2);

            $subscription->update([
                'plan_id' => $targetPlan->id,
                'plan_version_id' => $newVersion->id,
                'billing_cycle' => $newVersion->billing_cycle,
                'amount' => $newVersion->price,
                'currency' => $newVersion->currency,
                'entitlement_snapshot' => $newVersion->toEntitlementSnapshot(),
            ]);

            if ($creditDiff > 0) {
                $this->credits->postTransaction(
                    institutionId: $subscription->institution_id,
                    type: 'plan_allocation',
                    delta: $creditDiff,
                    actor: $actor,
                    reason: "Upgrade credit top-up ({$targetPlan->name})",
                    sourceType: Subscription::class,
                    sourceId: $subscription->id,
                );
            }

            if ($generateInvoice && $newVersion->price > $fromAmount) {
                $diff = round($newVersion->price - $fromAmount, 2);
                $this->billing->createInvoice([
                    'institutionId' => $subscription->institution_id,
                    'subscriptionId' => $subscription->id,
                    'currency' => $newVersion->currency,
                    'billingPeriodStart' => now()->toDateString(),
                    'billingPeriodEnd' => $subscription->end_at->toDateString(),
                    'items' => [[
                        'description' => "Plan upgrade adjustment to {$targetPlan->name}",
                        'quantity' => 1,
                        'unitPrice' => $diff,
                        'itemType' => 'adjustment',
                    ]],
                ], $actor);
            }

            $this->recordEvent($subscription, $eventType, $fromVersionId, $newVersion->id, $subscription->status, $subscription->status, $reason, $actor);
            $this->audit->record('owner.subscription_changed_plan', $subscription, ['planVersionId' => $fromVersionId], ['plan' => $targetPlan->code, 'planVersionId' => $newVersion->id, 'reason' => $reason], $actor, $subscription->institution_id);

            return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
        });
    }

    public function renew(Subscription $subscription, User $actor, bool $generateInvoice = true): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor, $generateInvoice): Subscription {
            $before = $subscription->status;
            $baseStart = $subscription->end_at->isFuture() ? $subscription->end_at->copy() : now();
            $nextEnd = $this->cycleEndDate($baseStart, $subscription->billing_cycle);

            $subscription->update([
                'status' => 'active',
                'end_at' => $nextEnd,
                'renewal_at' => $nextEnd,
                'grace_ends_at' => null,
            ]);

            if ($subscription->institution && in_array($subscription->institution->status, ['trial', 'expired', 'prospect'], true)) {
                $subscription->institution->update(['status' => 'active', 'trial_ends_at' => null]);
            }

            $allocatedCredits = (float) ($subscription->entitlement_snapshot['limits']['aiCredits'] ?? 0);
            if ($allocatedCredits > 0) {
                $this->credits->postTransaction(
                    institutionId: $subscription->institution_id,
                    type: 'plan_allocation',
                    delta: $allocatedCredits,
                    actor: $actor,
                    reason: 'Subscription renewal credit allocation',
                    sourceType: Subscription::class,
                    sourceId: $subscription->id,
                );
            }

            if ($generateInvoice && $subscription->amount > 0) {
                $this->billing->createInvoice([
                    'institutionId' => $subscription->institution_id,
                    'subscriptionId' => $subscription->id,
                    'currency' => $subscription->currency,
                    'billingPeriodStart' => $baseStart->toDateString(),
                    'billingPeriodEnd' => $nextEnd->toDateString(),
                    'items' => [[
                        'description' => ($subscription->plan?->name ?? 'Plan')." renewal ({$subscription->billing_cycle})",
                        'quantity' => 1,
                        'unitPrice' => $subscription->amount,
                        'itemType' => 'subscription',
                    ]],
                ], $actor);
            }

            $this->recordEvent($subscription, 'renewed', $subscription->plan_version_id, $subscription->plan_version_id, $before, 'active', 'Subscription renewed', $actor);
            $this->audit->record('owner.subscription_renewed', $subscription, ['status' => $before], ['status' => 'active', 'endAt' => $nextEnd->toIso8601String()], $actor, $subscription->institution_id);

            return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
        });
    }

    public function pause(Subscription $subscription, string $reason, User $actor): Subscription
    {
        if (! in_array($subscription->status, ['trial', 'active', 'past_due'], true)) {
            throw ValidationException::withMessages(['status' => ['Only live subscriptions can be paused.']]);
        }

        $before = $subscription->status;
        $subscription->update(['status' => 'paused', 'paused_at' => now()]);
        $this->recordEvent($subscription, 'paused', null, null, $before, 'paused', $reason, $actor);
        $this->audit->record('owner.subscription_paused', $subscription, ['status' => $before], ['status' => 'paused', 'reason' => $reason], $actor, $subscription->institution_id);

        return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
    }

    public function resume(Subscription $subscription, User $actor): Subscription
    {
        if ($subscription->status !== 'paused') {
            throw ValidationException::withMessages(['status' => ['Only paused subscriptions can be resumed.']]);
        }

        $subscription->update(['status' => 'active', 'paused_at' => null]);
        $this->recordEvent($subscription, 'resumed', null, null, 'paused', 'active', 'Subscription resumed', $actor);
        $this->audit->record('owner.subscription_resumed', $subscription, ['status' => 'paused'], ['status' => 'active'], $actor, $subscription->institution_id);

        return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
    }

    public function extend(Subscription $subscription, int $days, string $reason, User $actor): Subscription
    {
        if (in_array($subscription->status, ['cancelled'], true)) {
            throw ValidationException::withMessages(['status' => ['Cancelled subscriptions cannot be extended.']]);
        }

        $before = $subscription->end_at->toIso8601String();
        $newEnd = $subscription->end_at->copy()->addDays($days);
        $updates = ['end_at' => $newEnd, 'renewal_at' => $newEnd];

        if ($subscription->status === 'trial') {
            $updates['trial_end_at'] = $newEnd;
            $subscription->institution?->update(['trial_ends_at' => $newEnd]);
        } elseif ($subscription->status === 'expired') {
            $updates['status'] = 'active';
        }

        $subscription->update($updates);
        $this->recordEvent($subscription, 'extended', null, null, $subscription->status, $subscription->status, $reason." (+{$days}d)", $actor);
        $this->audit->record('owner.subscription_extended', $subscription, ['endAt' => $before], ['endAt' => $newEnd->toIso8601String(), 'days' => $days, 'reason' => $reason], $actor, $subscription->institution_id);

        return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
    }

    public function cancel(Subscription $subscription, string $reason, User $actor, bool $immediate = false): Subscription
    {
        if ($subscription->status === 'cancelled') {
            throw ValidationException::withMessages(['status' => ['Subscription is already cancelled.']]);
        }

        $before = $subscription->status;
        $subscription->update([
            'status' => 'cancelled',
            'auto_renew' => false,
            'cancel_reason' => trim($reason),
            'cancelled_at' => now(),
            'end_at' => $immediate ? now() : $subscription->end_at,
        ]);

        $this->recordEvent($subscription, 'cancelled', null, null, $before, 'cancelled', $reason, $actor);
        $this->audit->record('owner.subscription_cancelled', $subscription, ['status' => $before], ['status' => 'cancelled', 'reason' => $reason, 'immediate' => $immediate], $actor, $subscription->institution_id);

        return $subscription->fresh(['institution:id,name,code,status', 'plan:id,code,name', 'planVersion', 'events.actor:id,name']);
    }

    private function cycleEndDate(Carbon $start, string $cycle): Carbon
    {
        return match ($cycle) {
            'quarterly' => $start->copy()->addMonths(3)->endOfDay(),
            'yearly' => $start->copy()->addYear()->endOfDay(),
            default => $start->copy()->addMonth()->endOfDay(),
        };
    }

    private function recordEvent(
        Subscription $subscription,
        string $eventType,
        ?int $fromVersionId,
        ?int $toVersionId,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $reason,
        User $actor,
    ): void {
        SubscriptionEvent::query()->create([
            'subscription_id' => $subscription->id,
            'institution_id' => $subscription->institution_id,
            'event_type' => $eventType,
            'from_plan_version_id' => $fromVersionId,
            'to_plan_version_id' => $toVersionId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'reason' => $reason,
            'actor_id' => $actor->id,
            'created_at' => now(),
        ]);
    }
}

