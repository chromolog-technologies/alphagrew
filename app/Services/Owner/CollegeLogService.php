<?php

namespace App\Services\Owner;

use App\Models\ActivityLog;
use App\Models\AiUsageLog;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\LoginHistory;
use App\Models\SecurityEvent;
use App\Models\SubscriptionEvent;
use App\Models\User;
use App\Support\Owner\OwnerPermission as OP;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Unified read-only query, filtering, and redaction for platform & per-college logs.
 * Reused across OwnerPlatformController and OwnerInstitutionController.
 */
class CollegeLogService
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_hash',
        'remember_token',
        'mfa_secret',
        'mfa_recovery_codes',
        'secret',
        'secret_key',
        'webhook_secret',
        'client_secret',
        'private_key',
        'api_key',
        'api_token',
        'token',
        'access_token',
        'refresh_token',
        'challenge_token',
        'authorization',
    ];

    /** @return array{data: array<int, array<string, mixed>>, meta: array<string, int>} */
    public function paginatedAuditLogs(array $filters): array
    {
        $institutionId = isset($filters['institutionId']) ? (int) $filters['institutionId'] : null;
        $identities = $institutionId ? $this->institutionIdentities($institutionId) : null;

        $page = $this->auditBaseQuery($institutionId, $identities)
            ->when($filters['action'] ?? null, fn (Builder $q, string $action) => $q->where('action', 'like', $this->likePattern($action)))
            ->when($filters['actorId'] ?? null, fn (Builder $q, int $id) => $q->where('actor_id', $id))
            ->when($filters['from'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->latest('created_at')->latest('id')
            ->paginate($filters['perPage'] ?? 50);

        $institutions = $this->institutionNames(collect($page->items())->pluck('institution_id'));

        return [
            'data' => collect($page->items())->map(fn (AuditLog $log) => $this->mapAudit($log, $institutions[$log->institution_id] ?? null))->all(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    /** @return array{data: array<int, array<string, mixed>>, meta: array<string, int>} */
    public function paginatedActivityLogs(array $filters): array
    {
        $institutionId = isset($filters['institutionId']) ? (int) $filters['institutionId'] : null;
        $identities = $institutionId ? $this->institutionIdentities($institutionId) : null;

        $page = $this->activityBaseQuery($institutionId, $identities)
            ->when($filters['action'] ?? null, fn (Builder $q, string $action) => $q->where('action', 'like', $this->likePattern($action)))
            ->when($filters['modelType'] ?? null, fn (Builder $q, string $model) => $q->where('model_type', 'like', $this->likePattern($model)))
            ->when($filters['userId'] ?? null, fn (Builder $q, int $id) => $q->where('user_id', $id))
            ->when($filters['from'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->latest('created_at')->latest('id')
            ->paginate($filters['perPage'] ?? 50);

        $institutions = $this->institutionNames(collect($page->items())->pluck('institution_id'));

        return [
            'data' => collect($page->items())->map(fn (ActivityLog $log) => $this->mapActivity($log, $institutions[$log->institution_id] ?? null))->all(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    /** @return array{data: array<int, array<string, mixed>>, meta: array<string, int>, summary: Collection<string, int>} */
    public function paginatedLoginHistory(array $filters): array
    {
        $institutionId = isset($filters['institutionId']) ? (int) $filters['institutionId'] : null;
        $identities = $institutionId ? $this->institutionIdentities($institutionId) : null;

        $page = $this->loginBaseQuery($institutionId, $identities)
            ->when($filters['outcome'] ?? null, fn (Builder $q, string $outcome) => $q->where('outcome', $outcome))
            ->when($filters['email'] ?? null, fn (Builder $q, string $email) => $q->where('email', 'like', $this->likePattern($email)))
            ->when($filters['from'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->latest('created_at')->latest('id')
            ->paginate($filters['perPage'] ?? 50);

        return [
            'data' => collect($page->items())->map(fn (LoginHistory $entry) => $this->mapLogin($entry))->all(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
            'summary' => LoginHistory::query()->where('created_at', '>=', now()->subDay())->selectRaw('outcome, count(*) as total')->groupBy('outcome')->pluck('total', 'outcome'),
        ];
    }

    /** @return array{data: array<int, array<string, mixed>>, meta: array<string, int>} */
    public function paginatedSecurityEvents(array $filters): array
    {
        $institutionId = isset($filters['institutionId']) ? (int) $filters['institutionId'] : null;
        $identities = $institutionId ? $this->institutionIdentities($institutionId) : null;

        $page = $this->securityBaseQuery($institutionId, $identities)
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($filters['severity'] ?? null, fn (Builder $q, string $s) => $q->where('severity', $s))
            ->when($filters['from'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $q, string $date) => $q->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->latest('created_at')->latest('id')
            ->paginate($filters['perPage'] ?? 30);

        return [
            'data' => collect($page->items())->map(fn (SecurityEvent $e) => $this->mapSecurity($e))->all(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    /**
     * Aggregated log bundle for a single institution across all log streams the viewer is authorized to read.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function forInstitution(Institution $institution, array $filters, User $viewer): array
    {
        $limit = max(1, min(100, (int) ($filters['limit'] ?? 50)));
        $search = isset($filters['search']) ? mb_strtolower(trim((string) $filters['search'])) : '';
        $fetchLimit = $search !== '' ? 250 : $limit;
        $from = isset($filters['from']) ? Carbon::parse((string) $filters['from'])->startOfDay() : null;
        $to = isset($filters['to']) ? Carbon::parse((string) $filters['to'])->endOfDay() : null;
        $category = (string) ($filters['category'] ?? 'all');

        $identities = $this->institutionIdentities($institution->id);
        $canAudit = $viewer->ownerCan(OP::AUDIT_VIEW);
        $canSecurity = $viewer->ownerCan(OP::SECURITY_VIEW);
        $canStatus = $viewer->ownerCan(OP::INSTITUTIONS_VIEW);
        $canSubscriptions = $viewer->ownerCan(OP::SUBSCRIPTIONS_VIEW);
        $canAi = $viewer->ownerCan(OP::AI_VIEW);

        $auditQuery = $this->applyDates($this->auditBaseQuery($institution->id, $identities), $from, $to);
        $activityQuery = $this->applyDates($this->activityBaseQuery($institution->id, $identities), $from, $to);
        $loginQuery = $this->applyDates($this->loginBaseQuery($institution->id, $identities), $from, $to);
        $securityQuery = $this->applyDates($this->securityBaseQuery($institution->id, $identities), $from, $to);
        $statusQuery = $this->applyDates(
            InstitutionStatusEvent::query()->with('actor:id,name,email,role')->where('institution_id', $institution->id),
            $from,
            $to
        );
        $subQuery = $this->applyDates(
            SubscriptionEvent::query()->with('actor:id,name,email,role')->where('institution_id', $institution->id),
            $from,
            $to
        );
        $aiQuery = $this->applyDates(
            AiUsageLog::query()->with('user:id,name,email')->where('institution_id', $institution->id),
            $from,
            $to
        );

        $auditRows = $canAudit
            ? (clone $auditQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (AuditLog $l) => $this->mapAudit($l, $institution->name))->all()
            : [];

        $activityRows = $canAudit
            ? (clone $activityQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (ActivityLog $l) => $this->mapActivity($l, $institution->name))->all()
            : [];

        $loginRows = $canSecurity
            ? (clone $loginQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (LoginHistory $l) => $this->mapLogin($l))->all()
            : [];

        $securityRows = $canSecurity
            ? (clone $securityQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (SecurityEvent $e) => $this->mapSecurity($e))->all()
            : [];

        $statusRows = $canStatus
            ? (clone $statusQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (InstitutionStatusEvent $ev) => [
                    'id' => $ev->id,
                    'kind' => $ev->kind,
                    'from' => $ev->from_status,
                    'to' => $ev->to_status,
                    'reason' => $ev->reason,
                    'effectiveAt' => $ev->effective_at?->toIso8601String(),
                    'applied' => (bool) $ev->applied,
                    'actor' => $ev->actor?->name,
                    'at' => $ev->created_at?->toIso8601String(),
                ])->all()
            : [];

        $subscriptionRows = $canSubscriptions
            ? (clone $subQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (SubscriptionEvent $ev) => [
                    'id' => $ev->id,
                    'subscriptionId' => $ev->subscription_id,
                    'eventType' => $ev->event_type,
                    'fromStatus' => $ev->from_status,
                    'toStatus' => $ev->to_status,
                    'reason' => $ev->reason,
                    'metadata' => $this->redact($ev->metadata),
                    'actor' => $ev->actor?->name,
                    'at' => $ev->created_at?->toIso8601String(),
                ])->all()
            : [];

        $aiRows = $canAi
            ? (clone $aiQuery)->latest('created_at')->latest('id')->limit($fetchLimit)->get()
                ->map(fn (AiUsageLog $log) => [
                    'id' => $log->id,
                    'feature' => $log->feature,
                    'provider' => $log->provider,
                    'model' => $log->model,
                    'status' => $log->status,
                    'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
                    'promptTokens' => (int) $log->prompt_tokens,
                    'completionTokens' => (int) $log->completion_tokens,
                    'latencyMs' => (int) $log->latency_ms,
                    'creditsCharged' => (float) ($log->credits_charged ?? 0),
                    'estimatedCostUsd' => round((float) $log->estimated_cost_usd, 4),
                    'error' => $log->error,
                    'at' => $log->created_at?->toIso8601String(),
                ])->all()
            : [];

        $counts = [
            'audit' => $canAudit ? (int) $auditQuery->count() : 0,
            'activity' => $canAudit ? (int) $activityQuery->count() : 0,
            'login' => $canSecurity ? (int) $loginQuery->count() : 0,
            'security' => $canSecurity ? (int) $securityQuery->count() : 0,
            'status' => $canStatus ? (int) $statusQuery->count() : 0,
            'subscription' => $canSubscriptions ? (int) $subQuery->count() : 0,
            'ai' => $canAi ? (int) $aiQuery->count() : 0,
        ];
        $counts['total'] = array_sum($counts);

        $timeline = $this->buildTimeline(
            $auditRows,
            $activityRows,
            $loginRows,
            $securityRows,
            $statusRows,
            $subscriptionRows,
            $aiRows,
            $category,
            $search,
            $limit
        );

        return [
            'institution' => [
                'id' => $institution->id,
                'code' => $institution->code,
                'name' => $institution->name,
                'status' => $institution->status,
            ],
            'counts' => $counts,
            'timeline' => $timeline,
            'audit' => $this->filterRows($auditRows, $search, $limit),
            'activity' => $this->filterRows($activityRows, $search, $limit),
            'logins' => $this->filterRows($loginRows, $search, $limit),
            'security' => $this->filterRows($securityRows, $search, $limit),
            'status' => $this->filterRows($statusRows, $search, $limit),
            'subscription' => $this->filterRows($subscriptionRows, $search, $limit),
            'ai' => $this->filterRows($aiRows, $search, $limit),
        ];
    }

    /** @return array{userIds: array<int, int>, emails: array<int, string>} */
    public function institutionIdentities(int $institutionId): array
    {
        $users = User::query()->withoutGlobalScopes()->withTrashed()
            ->where('institution_id', $institutionId)
            ->get(['id', 'email']);

        return [
            'userIds' => $users->pluck('id')->all(),
            'emails' => $users->pluck('email')->filter()->map(fn (string $e) => strtolower($e))->unique()->values()->all(),
        ];
    }

    /** @param array{userIds: array<int, int>, emails: array<int, string>}|null $identities */
    private function auditBaseQuery(?int $institutionId, ?array $identities): Builder
    {
        return AuditLog::query()->withoutGlobalScopes()->with('actor:id,name,email,role')
            ->when($institutionId !== null, function (Builder $q) use ($institutionId, $identities): void {
                $userIds = $identities['userIds'] ?? [];
                $q->where(function (Builder $inner) use ($institutionId, $userIds): void {
                    $inner->where('institution_id', $institutionId)
                        ->orWhere(fn (Builder $sub) => $sub->where('subject_type', Institution::class)->where('subject_id', $institutionId));
                    if ($userIds !== []) {
                        $inner->orWhereIn('actor_id', $userIds);
                    }
                });
            });
    }

    /** @param array{userIds: array<int, int>, emails: array<int, string>}|null $identities */
    private function activityBaseQuery(?int $institutionId, ?array $identities): Builder
    {
        return ActivityLog::query()->withoutGlobalScopes()->with('user:id,name,email,role')
            ->when($institutionId !== null, function (Builder $q) use ($institutionId, $identities): void {
                $userIds = $identities['userIds'] ?? [];
                $q->where(function (Builder $inner) use ($institutionId, $userIds): void {
                    $inner->where('institution_id', $institutionId);
                    if ($userIds !== []) {
                        $inner->orWhereIn('user_id', $userIds);
                    }
                });
            });
    }

    /** @param array{userIds: array<int, int>, emails: array<int, string>}|null $identities */
    private function loginBaseQuery(?int $institutionId, ?array $identities): Builder
    {
        return LoginHistory::query()->with('institution:id,name')
            ->when($institutionId !== null, function (Builder $q) use ($institutionId, $identities): void {
                $userIds = $identities['userIds'] ?? [];
                $emails = $identities['emails'] ?? [];
                $q->where(function (Builder $inner) use ($institutionId, $userIds, $emails): void {
                    $inner->where('institution_id', $institutionId);
                    if ($userIds !== []) {
                        $inner->orWhereIn('user_id', $userIds);
                    }
                    if ($emails !== []) {
                        $inner->orWhereIn('email', $emails);
                    }
                });
            });
    }

    /** @param array{userIds: array<int, int>, emails: array<int, string>}|null $identities */
    private function securityBaseQuery(?int $institutionId, ?array $identities): Builder
    {
        return SecurityEvent::query()->with(['institution:id,name', 'resolver:id,name'])
            ->when($institutionId !== null, function (Builder $q) use ($institutionId, $identities): void {
                $userIds = $identities['userIds'] ?? [];
                $emails = $identities['emails'] ?? [];
                $q->where(function (Builder $inner) use ($institutionId, $userIds, $emails): void {
                    $inner->where('institution_id', $institutionId);
                    if ($userIds !== []) {
                        $inner->orWhereIn('user_id', $userIds);
                    }
                    if ($emails !== []) {
                        $inner->orWhereIn('email', $emails);
                    }
                });
            });
    }

    private function applyDates(Builder $query, ?Carbon $from, ?Carbon $to): Builder
    {
        return $query
            ->when($from, fn (Builder $q) => $q->where('created_at', '>=', $from))
            ->when($to, fn (Builder $q) => $q->where('created_at', '<=', $to));
    }

    /** @return array<string, mixed> */
    private function mapAudit(AuditLog $log, ?string $institutionName): array
    {
        return [
            'id' => $log->id,
            'action' => $log->action,
            'actor' => $log->actor ? ['id' => $log->actor->id, 'name' => $log->actor->name, 'email' => $log->actor->email, 'role' => $log->actor->role] : null,
            'institution' => $institutionName,
            'subjectType' => $log->subject_type ? class_basename($log->subject_type) : null,
            'subjectId' => $log->subject_id,
            'old' => $this->redact($log->old_values),
            'new' => $this->redact($log->new_values),
            'ip' => $log->ip_address,
            'userAgent' => $log->user_agent,
            'at' => $log->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function mapActivity(ActivityLog $log, ?string $institutionName): array
    {
        return [
            'id' => $log->id,
            'action' => $log->action,
            'modelType' => $log->model_type ? class_basename($log->model_type) : null,
            'modelId' => $log->model_id,
            'actor' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email, 'role' => $log->user->role] : null,
            'institution' => $institutionName,
            'changes' => $this->redact($log->changes),
            'ip' => $log->ip_address,
            'userAgent' => $log->user_agent,
            'at' => $log->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function mapLogin(LoginHistory $entry): array
    {
        return [
            'id' => $entry->id,
            'email' => $entry->email,
            'userId' => $entry->user_id,
            'institution' => $entry->institution?->name,
            'outcome' => $entry->outcome,
            'reason' => $entry->reason,
            'ip' => $entry->ip_address,
            'userAgent' => $entry->user_agent,
            'at' => $entry->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function mapSecurity(SecurityEvent $e): array
    {
        return [
            'id' => $e->id,
            'severity' => $e->severity,
            'eventType' => $e->event_type,
            'institution' => $e->institution?->name,
            'email' => $e->email,
            'ip' => $e->ip_address,
            'summary' => $e->summary,
            'metadata' => $this->redact($e->metadata),
            'status' => $e->status,
            'resolvedBy' => $e->resolver?->name,
            'resolvedAt' => $e->resolved_at?->toIso8601String(),
            'at' => $e->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function filterRows(array $rows, string $search, ?int $limit = null): array
    {
        if ($search !== '') {
            $rows = array_values(array_filter(
                $rows,
                fn (array $row): bool => str_contains(mb_strtolower((string) json_encode($row)), $search)
            ));
        }

        return $limit !== null ? array_slice($rows, 0, $limit) : $rows;
    }

    /** @return array<int, array<string, mixed>> */
    private function buildTimeline(
        array $audit,
        array $activity,
        array $logins,
        array $security,
        array $status,
        array $subscription,
        array $ai,
        string $category,
        string $search,
        int $limit,
    ): array {
        $items = [];

        if ($category === 'all' || $category === 'audit') {
            foreach ($audit as $row) {
                $items[] = [
                    'id' => 'audit-'.$row['id'],
                    'category' => 'audit',
                    'title' => $row['action'],
                    'detail' => trim(collect([$row['subjectType'], $row['subjectId'] ? '#'.$row['subjectId'] : null])->filter()->implode(' ')),
                    'statusOrSeverity' => 'audit',
                    'actor' => $row['actor']['email'] ?? ($row['actor']['name'] ?? 'System'),
                    'ip' => $row['ip'],
                    'at' => $row['at'],
                    'metadata' => ['old' => $row['old'], 'new' => $row['new']],
                ];
            }
        }

        if ($category === 'all' || $category === 'activity') {
            foreach ($activity as $row) {
                $items[] = [
                    'id' => 'activity-'.$row['id'],
                    'category' => 'activity',
                    'title' => trim(($row['modelType'] ?? 'Record').' '.$row['action']),
                    'detail' => $row['modelId'] ? '#'.$row['modelId'] : '',
                    'statusOrSeverity' => $row['action'],
                    'actor' => $row['actor']['email'] ?? ($row['actor']['name'] ?? 'System'),
                    'ip' => $row['ip'],
                    'at' => $row['at'],
                    'metadata' => $row['changes'],
                ];
            }
        }

        if ($category === 'all' || $category === 'login') {
            foreach ($logins as $row) {
                $items[] = [
                    'id' => 'login-'.$row['id'],
                    'category' => 'login',
                    'title' => 'Sign-in '.$row['outcome'],
                    'detail' => $row['reason'] ?? $row['email'],
                    'statusOrSeverity' => $row['outcome'],
                    'actor' => $row['email'],
                    'ip' => $row['ip'],
                    'at' => $row['at'],
                    'metadata' => ['userAgent' => $row['userAgent']],
                ];
            }
        }

        if ($category === 'all' || $category === 'security') {
            foreach ($security as $row) {
                $items[] = [
                    'id' => 'security-'.$row['id'],
                    'category' => 'security',
                    'title' => str_replace('_', ' ', $row['eventType']),
                    'detail' => $row['summary'],
                    'statusOrSeverity' => $row['severity'],
                    'actor' => $row['email'] ?? 'Platform',
                    'ip' => $row['ip'],
                    'at' => $row['at'],
                    'metadata' => $row['metadata'],
                ];
            }
        }

        if ($category === 'all' || $category === 'status') {
            foreach ($status as $row) {
                $items[] = [
                    'id' => 'status-'.$row['id'],
                    'category' => 'status',
                    'title' => ($row['kind'] === 'verification' ? 'Verification' : 'Status').': '.($row['from'] ? $row['from'].' → ' : '').$row['to'],
                    'detail' => $row['reason'] ?? ($row['applied'] ? 'Applied' : 'Scheduled'),
                    'statusOrSeverity' => $row['to'],
                    'actor' => $row['actor'] ?? 'System',
                    'ip' => null,
                    'at' => $row['at'],
                    'metadata' => ['effectiveAt' => $row['effectiveAt'], 'applied' => $row['applied']],
                ];
            }
        }

        if ($category === 'all' || $category === 'subscription') {
            foreach ($subscription as $row) {
                $items[] = [
                    'id' => 'sub-'.$row['id'],
                    'category' => 'subscription',
                    'title' => 'Subscription '.$row['eventType'],
                    'detail' => trim(collect([$row['fromStatus'] ? $row['fromStatus'].' → '.$row['toStatus'] : $row['toStatus'], $row['reason']])->filter()->implode(' · ')),
                    'statusOrSeverity' => $row['toStatus'] ?? $row['eventType'],
                    'actor' => $row['actor'] ?? 'System',
                    'ip' => null,
                    'at' => $row['at'],
                    'metadata' => $row['metadata'],
                ];
            }
        }

        if ($category === 'all' || $category === 'ai') {
            foreach ($ai as $row) {
                $items[] = [
                    'id' => 'ai-'.$row['id'],
                    'category' => 'ai',
                    'title' => 'AI '.$row['feature'],
                    'detail' => "{$row['model']} · {$row['creditsCharged']} credits · {$row['latencyMs']}ms".($row['error'] ? " · {$row['error']}" : ''),
                    'statusOrSeverity' => $row['status'],
                    'actor' => $row['user']['email'] ?? ($row['user']['name'] ?? 'System'),
                    'ip' => null,
                    'at' => $row['at'],
                    'metadata' => ['provider' => $row['provider'], 'promptTokens' => $row['promptTokens'], 'completionTokens' => $row['completionTokens'], 'estimatedCostUsd' => $row['estimatedCostUsd']],
                ];
            }
        }

        if ($search !== '') {
            $items = $this->filterRows($items, $search);
        }

        usort($items, static fn (array $a, array $b): int => strcmp((string) ($b['at'] ?? ''), (string) ($a['at'] ?? '')));

        return array_slice($items, 0, $limit);
    }

    /** @return array<int, string> */
    private function institutionNames(Collection $ids): array
    {
        $unique = $ids->filter()->unique();

        return $unique->isEmpty() ? [] : Institution::query()->whereIn('id', $unique)->pluck('name', 'id')->all();
    }

    private function likePattern(string $term): string
    {
        return '%'.addcslashes(trim($term), '\\%_').'%';
    }

    /** @param array<string, mixed>|null $payload */
    private function redact(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        $clean = [];
        foreach ($payload as $key => $value) {
            if (is_string($key) && $this->isSensitiveKey($key)) {
                $clean[$key] = '[redacted]';
                continue;
            }
            $clean[$key] = is_array($value) ? $this->redact($value) : $value;
        }

        return $clean;
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower((string) preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', str_replace('-', '_', $key)));
        if (in_array($normalized, self::SENSITIVE_KEYS, true)) {
            return true;
        }

        foreach (['password', 'secret', 'private_key', 'api_key', 'api_token', 'access_token', 'refresh_token', 'authorization'] as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }
}
