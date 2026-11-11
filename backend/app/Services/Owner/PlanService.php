<?php

namespace App\Services\Owner;

use App\Models\Plan;
use App\Models\PlanVersion;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Subscription plan catalog and immutable plan versioning (SRS §5.6).
 */
class PlanService
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    /** @param array<string, mixed> $data */
    public function create(array $data, User $actor): Plan
    {
        return DB::transaction(function () use ($data, $actor): Plan {
            $status = $data['status'] ?? 'draft';
            $plan = Plan::query()->create([
                'code' => strtoupper(trim((string) $data['code'])),
                'name' => trim((string) $data['name']),
                'description' => isset($data['description']) ? trim((string) $data['description']) : null,
                'status' => $status,
                'sort_order' => (int) ($data['sortOrder'] ?? 0),
                'is_public' => (bool) ($data['isPublic'] ?? true),
            ]);

            $this->createVersion($plan, 1, $data, $actor, $status === 'active');
            $this->audit->record('owner.plan_created', $plan, [], [
                'code' => $plan->code,
                'name' => $plan->name,
                'status' => $plan->status,
            ], $actor);

            return $plan->fresh(['currentVersion', 'versions']);
        });
    }

    /**
     * Edits plan metadata and, when commercial terms or entitlements change, publishes a new
     * PlanVersion (FR-PL-005) so existing subscriptions keep their agreed terms unless migrated.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Plan $plan, array $data, User $actor): Plan
    {
        return DB::transaction(function () use ($plan, $data, $actor): Plan {
            $before = [
                'name' => $plan->name,
                'status' => $plan->status,
                'version' => $plan->currentVersion?->version_number,
            ];

            $meta = [];
            if (array_key_exists('name', $data)) {
                $meta['name'] = trim((string) $data['name']);
            }
            if (array_key_exists('description', $data)) {
                $meta['description'] = $data['description'] !== null ? trim((string) $data['description']) : null;
            }
            if (array_key_exists('sortOrder', $data)) {
                $meta['sort_order'] = (int) $data['sortOrder'];
            }
            if (array_key_exists('isPublic', $data)) {
                $meta['is_public'] = (bool) $data['isPublic'];
            }
            if ($meta !== []) {
                $plan->update($meta);
            }

            $current = $plan->currentVersion;
            if ($this->hasCommercialFields($data) || ! $current) {
                $merged = $this->mergeVersionPayload($current, $data);
                $nextVersion = ($plan->versions()->max('version_number') ?? 0) + 1;
                $plan->versions()->update(['is_current' => false]);
                $this->createVersion($plan, $nextVersion, $merged, $actor, $plan->status === 'active');
            }

            $plan->refresh()->load(['currentVersion', 'versions']);
            $this->audit->record('owner.plan_updated', $plan, $before, [
                'name' => $plan->name,
                'status' => $plan->status,
                'version' => $plan->currentVersion?->version_number,
            ], $actor);

            return $plan;
        });
    }

    /** @param array<string, mixed> $overrides */
    public function clonePlan(Plan $source, array $overrides, User $actor): Plan
    {
        $source->loadMissing('currentVersion');
        $v = $source->currentVersion;

        $payload = [
            'code' => $overrides['code'] ?? ($source->code.'_COPY_'.substr((string) time(), -4)),
            'name' => $overrides['name'] ?? ($source->name.' Copy'),
            'description' => $source->description,
            'status' => 'draft',
            'sortOrder' => $source->sort_order,
            'isPublic' => $source->is_public,
            'billingCycle' => $v?->billing_cycle ?? 'monthly',
            'price' => $v?->price ?? 0,
            'setupFee' => $v?->setup_fee ?? 0,
            'currency' => $v?->currency ?? (string) PlatformSetting::get('currency'),
            'trialDays' => $v?->trial_days ?? 14,
            'studentLimit' => $v?->student_limit,
            'facultyLimit' => $v?->faculty_limit,
            'campusLimit' => $v?->campus_limit,
            'departmentLimit' => $v?->department_limit,
            'recruiterLimit' => $v?->recruiter_limit,
            'storageLimitMb' => $v?->storage_limit_mb ?? 5120,
            'apiRequestsLimit' => $v?->api_requests_limit,
            'aiCreditAllocation' => $v?->ai_credit_allocation ?? 0,
            'aiCreditResetPeriod' => $v?->ai_credit_reset_period ?? 'monthly',
            'features' => $v?->features ?? [],
        ];

        $cloned = $this->create($payload, $actor);
        $this->audit->record('owner.plan_cloned', $cloned, ['sourcePlanId' => $source->id], ['code' => $cloned->code], $actor);

        return $cloned;
    }

    public function publish(Plan $plan, User $actor): Plan
    {
        return DB::transaction(function () use ($plan, $actor): Plan {
            $before = $plan->status;
            $plan->update(['status' => 'active']);
            $plan->versions()->where('is_current', true)->whereNull('published_at')->update(['published_at' => now()]);
            $this->audit->record('owner.plan_published', $plan, ['status' => $before], ['status' => 'active'], $actor);

            return $plan->fresh(['currentVersion', 'versions']);
        });
    }

    public function archive(Plan $plan, User $actor): Plan
    {
        $before = $plan->status;
        $plan->update(['status' => 'archived']);
        $this->audit->record('owner.plan_archived', $plan, ['status' => $before], ['status' => 'archived'], $actor);

        return $plan->fresh(['currentVersion', 'versions']);
    }

    public function delete(Plan $plan, User $actor): void
    {
        if ($plan->subscriptions()->exists()) {
            throw ValidationException::withMessages([
                'plan' => ['Plans referenced by subscriptions cannot be deleted; archive the plan instead.'],
            ]);
        }

        $before = ['code' => $plan->code, 'name' => $plan->name];
        $plan->delete();
        $this->audit->record('owner.plan_deleted', null, $before, [], $actor);
    }

    /** @param array<string, mixed> $data */
    private function createVersion(Plan $plan, int $versionNumber, array $data, User $actor, bool $published): PlanVersion
    {
        $rawFeatures = is_array($data['features'] ?? null) ? $data['features'] : [];
        $features = collect(PlanVersion::FEATURE_KEYS)
            ->mapWithKeys(fn (string $key) => [$key => (bool) ($rawFeatures[$key] ?? false)])
            ->all();

        return PlanVersion::query()->create([
            'plan_id' => $plan->id,
            'version_number' => $versionNumber,
            'billing_cycle' => $data['billingCycle'] ?? 'monthly',
            'price' => round((float) ($data['price'] ?? 0), 2),
            'setup_fee' => round((float) ($data['setupFee'] ?? 0), 2),
            'currency' => strtoupper((string) ($data['currency'] ?? PlatformSetting::get('currency') ?? 'INR')),
            'trial_days' => (int) ($data['trialDays'] ?? 14),
            'student_limit' => isset($data['studentLimit']) && $data['studentLimit'] !== '' ? (int) $data['studentLimit'] : null,
            'faculty_limit' => isset($data['facultyLimit']) && $data['facultyLimit'] !== '' ? (int) $data['facultyLimit'] : null,
            'campus_limit' => isset($data['campusLimit']) && $data['campusLimit'] !== '' ? (int) $data['campusLimit'] : null,
            'department_limit' => isset($data['departmentLimit']) && $data['departmentLimit'] !== '' ? (int) $data['departmentLimit'] : null,
            'recruiter_limit' => isset($data['recruiterLimit']) && $data['recruiterLimit'] !== '' ? (int) $data['recruiterLimit'] : null,
            'storage_limit_mb' => (int) ($data['storageLimitMb'] ?? 5120),
            'api_requests_limit' => isset($data['apiRequestsLimit']) && $data['apiRequestsLimit'] !== '' ? (int) $data['apiRequestsLimit'] : null,
            'ai_credit_allocation' => round((float) ($data['aiCreditAllocation'] ?? 0), 2),
            'ai_credit_reset_period' => $data['aiCreditResetPeriod'] ?? 'monthly',
            'features' => $features,
            'is_current' => true,
            'published_at' => $published ? now() : null,
            'created_by' => $actor->id,
        ]);
    }

    /** @param array<string, mixed> $data */
    private function hasCommercialFields(array $data): bool
    {
        foreach ([
            'billingCycle', 'price', 'setupFee', 'currency', 'trialDays',
            'studentLimit', 'facultyLimit', 'campusLimit', 'departmentLimit',
            'recruiterLimit', 'storageLimitMb', 'apiRequestsLimit',
            'aiCreditAllocation', 'aiCreditResetPeriod', 'features',
        ] as $key) {
            if (array_key_exists($key, $data)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mergeVersionPayload(?PlanVersion $current, array $data): array
    {
        if (! $current) {
            return $data;
        }

        return [
            'billingCycle' => $data['billingCycle'] ?? $current->billing_cycle,
            'price' => $data['price'] ?? $current->price,
            'setupFee' => $data['setupFee'] ?? $current->setup_fee,
            'currency' => $data['currency'] ?? $current->currency,
            'trialDays' => $data['trialDays'] ?? $current->trial_days,
            'studentLimit' => array_key_exists('studentLimit', $data) ? $data['studentLimit'] : $current->student_limit,
            'facultyLimit' => array_key_exists('facultyLimit', $data) ? $data['facultyLimit'] : $current->faculty_limit,
            'campusLimit' => array_key_exists('campusLimit', $data) ? $data['campusLimit'] : $current->campus_limit,
            'departmentLimit' => array_key_exists('departmentLimit', $data) ? $data['departmentLimit'] : $current->department_limit,
            'recruiterLimit' => array_key_exists('recruiterLimit', $data) ? $data['recruiterLimit'] : $current->recruiter_limit,
            'storageLimitMb' => $data['storageLimitMb'] ?? $current->storage_limit_mb,
            'apiRequestsLimit' => array_key_exists('apiRequestsLimit', $data) ? $data['apiRequestsLimit'] : $current->api_requests_limit,
            'aiCreditAllocation' => $data['aiCreditAllocation'] ?? $current->ai_credit_allocation,
            'aiCreditResetPeriod' => $data['aiCreditResetPeriod'] ?? $current->ai_credit_reset_period,
            'features' => array_key_exists('features', $data)
                ? [...($current->features ?? []), ...(is_array($data['features']) ? $data['features'] : [])]
                : ($current->features ?? []),
        ];
    }
}

