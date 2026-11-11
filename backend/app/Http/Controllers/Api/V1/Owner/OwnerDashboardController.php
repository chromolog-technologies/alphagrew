<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AiCreditWallet;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PlatformSetting;
use App\Models\SecurityEvent;
use App\Models\Student;
use App\Models\Subscription;
use App\Models\SystemIncident;
use App\Models\User;
use App\Services\Owner\BillingService;
use App\Services\Owner\SystemHealth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Owner overview (SRS FR-OV / §6). Platform-wide aggregates only; no student records.
 * Includes Release 2 commercial KPIs (MRR, ARR, subscriptions, collections) and
 * ledger-backed AI credit balances alongside metered AI usage.
 */
class OwnerDashboardController extends Controller
{
    public function summary(Request $request, SystemHealth $health, BillingService $billing): JsonResponse
    {
        [$from, $to] = $this->period($request);
        $statusFilter = $request->validate([
            'status' => ['nullable', \Illuminate\Validation\Rule::in(Institution::STATUSES)],
        ])['status'] ?? null;

        $scopedInstitutions = $statusFilter ? Institution::query()->where('status', $statusFilter)->pluck('id') : null;

        $institutions = Institution::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $users = User::query()->withoutGlobalScopes()->whereNull('deleted_at')
            ->when($scopedInstitutions !== null, fn ($q) => $q->whereIn('institution_id', $scopedInstitutions))
            ->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role');
        $ai = DB::table('ai_usage_logs')->whereBetween('created_at', [$from, $to])
            ->when($scopedInstitutions !== null, fn ($q) => $q->whereIn('institution_id', $scopedInstitutions))
            ->selectRaw("count(*) as calls, sum(case when status = 'success' then 0 else 1 end) as failures, coalesce(sum(prompt_tokens), 0) + coalesce(sum(completion_tokens), 0) as tokens, coalesce(sum(estimated_cost_usd), 0) as cost, coalesce(sum(credits_charged), 0) as credits_used")
            ->first();
        $wallets = DB::table('ai_credit_wallets')
            ->when($scopedInstitutions !== null, fn ($q) => $q->whereIn('institution_id', $scopedInstitutions))
            ->selectRaw('coalesce(sum(allocated_total), 0) as allocated, coalesce(sum(consumed_total), 0) as consumed, coalesce(sum(balance), 0) as remaining')
            ->first();
        $revenue = $billing->revenueSummary($from, $to);
        $snapshot = $health->snapshot();

        return response()->json(['data' => [
            'period' => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'filterStatus' => $statusFilter,
            'defaultCurrency' => PlatformSetting::get('currency'),
            'institutions' => [
                'total' => $statusFilter ? (int) ($institutions[$statusFilter] ?? 0) : (int) $institutions->sum(),
                'byStatus' => collect(Institution::STATUSES)->mapWithKeys(fn (string $status) => [$status => (int) ($institutions[$status] ?? 0)]),
                'pendingVerification' => Institution::query()->whereIn('verification_status', ['pending', 'requires_information'])
                    ->when($statusFilter, fn ($q) => $q->where('status', $statusFilter))->count(),
                'newInPeriod' => Institution::query()->whereBetween('created_at', [$from, $to])
                    ->when($statusFilter, fn ($q) => $q->where('status', $statusFilter))->count(),
            ],
            'users' => [
                'total' => (int) $users->sum(),
                'byRole' => collect(UserRole::cases())->mapWithKeys(fn (UserRole $role) => [$role->value => (int) ($users[$role->value] ?? 0)]),
                'studentRecords' => Student::query()->withoutGlobalScopes()->whereNull('deleted_at')
                    ->when($scopedInstitutions !== null, fn ($q) => $q->whereIn('institution_id', $scopedInstitutions))->count(),
                'activeInPeriod' => User::query()->withoutGlobalScopes()->whereBetween('last_login_at', [$from, $to])
                    ->when($scopedInstitutions !== null, fn ($q) => $q->whereIn('institution_id', $scopedInstitutions))->count(),
            ],
            'commercial' => [
                'currency' => $revenue['currency'],
                'mrr' => $revenue['mrr'],
                'arr' => $revenue['arr'],
                'invoiced' => $revenue['invoiced'],
                'collectedRevenue' => $revenue['collected'],
                'outstandingBalance' => $revenue['outstanding'],
                'subscriptions' => $revenue['subscriptions'],
                'planDistribution' => $revenue['byPlan'],
            ],
            'ai' => [
                'calls' => (int) ($ai->calls ?? 0),
                'failures' => (int) ($ai->failures ?? 0),
                'tokens' => (int) ($ai->tokens ?? 0),
                'estimatedCostUsd' => round((float) ($ai->cost ?? 0), 2),
                'creditsAllocated' => round((float) ($wallets->allocated ?? 0), 2),
                'creditsConsumed' => round((float) ($wallets->consumed ?? 0), 2),
                'creditsRemaining' => round((float) ($wallets->remaining ?? 0), 2),
                'creditsUsedInPeriod' => round((float) ($ai->credits_used ?? 0), 2),
                'note' => 'Ledger-backed AI credit balances; provider USD cost is metered estimate.',
            ],
            'system' => [
                'status' => $snapshot['status'],
                'checkedAt' => $snapshot['checkedAt'],
                'checks' => $snapshot['checks'],
                'openIncidents' => SystemIncident::query()->where('status', '!=', 'resolved')->count(),
                'openSecurityEvents' => SecurityEvent::query()->where('status', '!=', 'resolved')->count(),
            ],
            'generatedAt' => now()->toIso8601String(),
        ]]);
    }

    /** Monthly series for the last 12 months: institutions, users, revenue, AI calls & cost. */
    public function trends(): JsonResponse
    {
        $start = now()->startOfMonth()->subMonths(11);
        $months = collect(range(0, 11))->map(fn (int $i) => $start->copy()->addMonths($i)->format('Y-m'));
        $bucket = fn ($dates) => collect($dates)->countBy(fn ($date) => Carbon::parse($date)->format('Y-m'));

        $institutions = $bucket(Institution::query()->where('created_at', '>=', $start)->pluck('created_at'));
        $users = $bucket(User::query()->withoutGlobalScopes()->where('created_at', '>=', $start)->pluck('created_at'));
        $ai = DB::table('ai_usage_logs')->where('created_at', '>=', $start)->get(['created_at', 'estimated_cost_usd', 'credits_charged'])
            ->groupBy(fn ($row) => Carbon::parse($row->created_at)->format('Y-m'));
        $payments = Payment::query()
            ->whereIn('status', ['succeeded', 'partially_refunded'])
            ->where('paid_at', '>=', $start)
            ->get(['paid_at', 'amount', 'refunded_amount'])
            ->groupBy(fn (Payment $p) => $p->paid_at?->format('Y-m') ?? '');
        $before = Institution::query()->where('created_at', '<', $start)->count();

        $running = $before;

        return response()->json(['data' => $months->map(function (string $month) use ($institutions, $users, $ai, $payments, &$running) {
            $running += $institutions[$month] ?? 0;
            $collected = isset($payments[$month])
                ? round((float) $payments[$month]->sum(fn (Payment $p) => max(0, $p->amount - $p->refunded_amount)), 2)
                : 0.0;

            return [
                'month' => $month,
                'newInstitutions' => $institutions[$month] ?? 0,
                'totalInstitutions' => $running,
                'newUsers' => $users[$month] ?? 0,
                'revenueCollected' => $collected,
                'aiCalls' => isset($ai[$month]) ? $ai[$month]->count() : 0,
                'aiCostUsd' => isset($ai[$month]) ? round((float) $ai[$month]->sum('estimated_cost_usd'), 2) : 0,
                'aiCreditsUsed' => isset($ai[$month]) ? round((float) $ai[$month]->sum('credits_charged'), 2) : 0,
            ];
        })->values()]);
    }

    /** Things an operator should act on, most urgent first. */
    public function alerts(SystemHealth $health): JsonResponse
    {
        $alerts = [];
        $add = function (string $severity, string $type, string $message, ?string $link = null) use (&$alerts): void {
            $alerts[] = compact('severity', 'type', 'message', 'link');
        };

        foreach ($health->snapshot()['checks'] as $check) {
            if ($check['status'] !== 'ok') {
                $add($check['status'] === 'down' ? 'critical' : 'warning', "system.{$check['key']}", "{$check['label']}: {$check['detail']}", 'system');
            }
        }

        $pending = Institution::query()->whereIn('verification_status', ['pending', 'requires_information'])->get(['id', 'name', 'verification_status']);
        foreach ($pending as $institution) {
            $add('info', 'institution.verification', "{$institution->name} is waiting for verification".($institution->verification_status === 'requires_information' ? ' (information requested)' : '').'.', "institutions/{$institution->id}");
        }

        $trials = Institution::query()->where('status', 'trial')->whereNotNull('trial_ends_at')->where('trial_ends_at', '<=', now()->addDays(14))->get(['id', 'name', 'trial_ends_at']);
        foreach ($trials as $institution) {
            $days = (int) max(0, ceil(now()->diffInDays($institution->trial_ends_at, false)));
            $add($days <= 3 ? 'warning' : 'info', 'institution.trial_ending', "{$institution->name}'s trial ends in {$days} days.", "institutions/{$institution->id}");
        }

        $scheduled = InstitutionStatusEvent::query()->with('institution:id,name')->where('applied', false)->orderBy('effective_at')->get();
        foreach ($scheduled as $event) {
            $add('info', 'institution.scheduled', "{$event->institution?->name} becomes {$event->to_status} on {$event->effective_at->format('j M Y, H:i')}.", "institutions/{$event->institution_id}");
        }

        $withoutAdmin = Institution::query()->whereIn('status', ['trial', 'active'])
            ->whereDoesntHave('users', fn ($query) => $query->withoutGlobalScopes()->where('role', UserRole::InstitutionAdmin->value)->where('status', 'active'))
            ->get(['id', 'name']);
        foreach ($withoutAdmin as $institution) {
            $add('warning', 'institution.no_admin', "{$institution->name} has no active institution admin.", "institutions/{$institution->id}");
        }

        // Release 2 commercial & AI alerts (SRS FR-SUB-006, FR-AI-007).
        $expiringSubs = Subscription::query()->with(['institution:id,name', 'plan:id,name'])
            ->whereIn('status', ['active', 'trial'])
            ->whereNotNull('renewal_at')
            ->where('renewal_at', '<=', now()->addDays(14))
            ->get();
        foreach ($expiringSubs as $sub) {
            $days = (int) max(0, ceil(now()->diffInDays($sub->renewal_at, false)));
            $add($days <= 3 ? 'warning' : 'info', 'subscription.expiring', "{$sub->institution?->name}'s {$sub->plan?->name} subscription renews/expires in {$days} days.", 'subscriptions');
        }

        $overdueInvoices = Invoice::query()->with('institution:id,name')
            ->whereIn('status', ['issued', 'partially_paid', 'overdue'])
            ->whereDate('due_at', '<', now()->toDateString())
            ->limit(10)
            ->get();
        foreach ($overdueInvoices as $inv) {
            $add('warning', 'billing.invoice_overdue', "Invoice {$inv->invoice_number} for {$inv->institution?->name} ({$inv->currency} {$inv->balance}) is past due.", 'billing');
        }

        $wallets = AiCreditWallet::query()->with('institution:id,name')->where('allocated_total', '>', 0)->get();
        foreach ($wallets as $wallet) {
            $pct = $wallet->usedPercent();
            if ($pct >= $wallet->warning_threshold_percent) {
                $add($wallet->balance <= 0 ? 'critical' : 'warning', 'ai.credits_threshold', "{$wallet->institution?->name} has used {$pct}% of allocated AI credits (remaining: {$wallet->balance}).", 'ai');
            }
        }

        $order = ['critical' => 0, 'warning' => 1, 'info' => 2];
        usort($alerts, fn ($a, $b) => $order[$a['severity']] <=> $order[$b['severity']]);

        return response()->json(['data' => $alerts, 'generatedAt' => now()->toIso8601String()]);
    }

    public function activity(): JsonResponse
    {
        $logs = AuditLog::query()->withoutGlobalScopes()->with(['actor:id,name,role'])->latest('created_at')->latest('id')->limit(20)->get();
        $institutions = Institution::query()->whereIn('id', $logs->pluck('institution_id')->filter()->unique())->pluck('name', 'id');

        return response()->json(['data' => $logs->map(fn (AuditLog $log) => [
            'id' => $log->id,
            'action' => $log->action,
            'actor' => $log->actor?->name,
            'actorRole' => $log->actor?->role,
            'institution' => $institutions[$log->institution_id] ?? null,
            'subjectType' => $log->subject_type ? class_basename($log->subject_type) : null,
            'subjectId' => $log->subject_id,
            'at' => $log->created_at?->toIso8601String(),
        ])]);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function period(Request $request): array
    {
        $validated = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);

        return [
            isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : now()->subDays(29)->startOfDay(),
            isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : now()->endOfDay(),
        ];
    }
}
