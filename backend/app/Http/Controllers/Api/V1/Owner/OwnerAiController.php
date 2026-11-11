<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\AiRateCard;
use App\Models\AiUsageLog;
use App\Models\Institution;
use App\Services\Audit\AuditLogger;
use App\Services\Owner\AiCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * AI usage logs, institution credit wallets, append-only ledger, providers and rate cards (SRS §5.9).
 */
class OwnerAiController extends Controller
{
    public function __construct(
        private readonly AiCreditService $credits,
        private readonly AuditLogger $audit,
    ) {
    }

    public function usage(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'institutionId' => ['nullable', 'integer'],
            'feature' => ['nullable', 'string', 'max:60'],
            'provider' => ['nullable', 'string', 'max:60'],
            'model' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:30'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $baseQuery = AiUsageLog::query()
            ->when($filters['institutionId'] ?? null, fn ($q, int $id) => $q->where('institution_id', $id))
            ->when($filters['feature'] ?? null, fn ($q, string $f) => $q->where('feature', $f))
            ->when($filters['provider'] ?? null, fn ($q, string $p) => $q->where('provider', $p))
            ->when($filters['model'] ?? null, fn ($q, string $m) => $q->where('model', $m))
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['from'] ?? null, fn ($q, string $d) => $q->where('created_at', '>=', Carbon::parse($d)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($q, string $d) => $q->where('created_at', '<=', Carbon::parse($d)->endOfDay()));

        $totals = (clone $baseQuery)->selectRaw(
            "count(*) as calls, sum(case when status = 'success' then 0 else 1 end) as failures, coalesce(sum(prompt_tokens + completion_tokens), 0) as tokens, coalesce(sum(estimated_cost_usd), 0) as cost_usd, coalesce(sum(credits_charged), 0) as credits"
        )->first();

        $page = (clone $baseQuery)
            ->with(['institution:id,name,code', 'user:id,name,email'])
            ->latest('id')
            ->paginate($filters['perPage'] ?? 30);

        return response()->json([
            'data' => collect($page->items())->map(fn (AiUsageLog $log) => [
                'id' => $log->id,
                'institution' => $log->institution ? ['id' => $log->institution->id, 'name' => $log->institution->name, 'code' => $log->institution->code] : null,
                'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name] : null,
                'feature' => $log->feature,
                'provider' => $log->provider,
                'model' => $log->model,
                'status' => $log->status,
                'promptTokens' => $log->prompt_tokens,
                'completionTokens' => $log->completion_tokens,
                'latencyMs' => $log->latency_ms,
                'estimatedCostUsd' => round((float) $log->estimated_cost_usd, 6),
                'creditsCharged' => $log->credits_charged,
                'error' => $log->error,
                'at' => $log->created_at?->toIso8601String(),
            ]),
            'summary' => [
                'calls' => (int) ($totals->calls ?? 0),
                'failures' => (int) ($totals->failures ?? 0),
                'tokens' => (int) ($totals->tokens ?? 0),
                'estimatedCostUsd' => round((float) ($totals->cost_usd ?? 0), 4),
                'creditsCharged' => round((float) ($totals->credits ?? 0), 2),
            ],
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function credits(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        // Ensure every active/trial/prospect institution has a wallet row ready to view.
        $institutions = Institution::query()
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%"))
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'status']);

        foreach ($institutions as $inst) {
            $this->credits->walletFor($inst->id);
        }

        $wallets = AiCreditWallet::query()
            ->with('institution:id,name,code,status')
            ->whereIn('institution_id', $institutions->pluck('id'))
            ->get();

        $totals = DB::table('ai_credit_wallets')->selectRaw(
            'coalesce(sum(allocated_total), 0) as allocated, coalesce(sum(consumed_total), 0) as consumed, coalesce(sum(balance), 0) as balance'
        )->first();

        return response()->json([
            'data' => $wallets->map(fn (AiCreditWallet $w) => $this->presentWallet($w))->values(),
            'summary' => [
                'allocated' => round((float) ($totals->allocated ?? 0), 2),
                'consumed' => round((float) ($totals->consumed ?? 0), 2),
                'remaining' => round((float) ($totals->balance ?? 0), 2),
            ],
        ]);
    }

    public function ledger(Request $request, Institution $institution): JsonResponse
    {
        $perPage = (int) ($request->validate(['perPage' => ['nullable', 'integer', 'between:1,100']])['perPage'] ?? 30);
        $wallet = $this->credits->walletFor($institution->id);

        $page = AiCreditTransaction::query()
            ->with('actor:id,name,email')
            ->where('wallet_id', $wallet->id)
            ->latest('id')
            ->paginate($perPage);

        return response()->json([
            'wallet' => $this->presentWallet($wallet->load('institution:id,name,code,status')),
            'data' => collect($page->items())->map(fn (AiCreditTransaction $tx) => [
                'id' => $tx->id,
                'type' => $tx->transaction_type,
                'creditsDelta' => $tx->credits_delta,
                'balanceAfter' => $tx->balance_after,
                'reason' => $tx->reason,
                'expiresAt' => $tx->expires_at?->toIso8601String(),
                'actor' => $tx->actor?->name ?? 'System',
                'at' => $tx->created_at?->toIso8601String(),
            ]),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function adjustCredits(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionId' => ['required', 'integer', 'exists:institutions,id'],
            'transactionType' => ['required', Rule::in(['plan_allocation', 'bonus', 'purchased', 'manual_adjustment', 'reversal', 'expiry'])],
            'creditsDelta' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'max:500'],
            'expiresAt' => ['nullable', 'date'],
        ]);

        $tx = $this->credits->postTransaction(
            institutionId: (int) $data['institutionId'],
            type: $data['transactionType'],
            delta: (float) $data['creditsDelta'],
            actor: $request->user(),
            reason: $data['reason'],
            expiresAt: isset($data['expiresAt']) ? Carbon::parse($data['expiresAt']) : null,
        );

        $wallet = $this->credits->walletFor((int) $data['institutionId'])->load('institution:id,name,code,status');

        return response()->json([
            'data' => [
                'transactionId' => $tx->id,
                'wallet' => $this->presentWallet($wallet),
            ],
        ], 201);
    }

    public function updateWalletPolicy(Request $request, Institution $institution): JsonResponse
    {
        $data = $request->validate([
            'monthlyQuota' => ['nullable', 'numeric', 'min:0'],
            'warningThresholdPercent' => ['sometimes', 'integer', 'between:10,99'],
            'hardStopOnExhaustion' => ['sometimes', 'boolean'],
            'chargeFailedRequests' => ['sometimes', 'boolean'],
        ]);

        $wallet = $this->credits->updatePolicy($institution->id, $data, $request->user());

        return response()->json(['data' => $this->presentWallet($wallet->load('institution:id,name,code,status'))]);
    }

    public function providers(): JsonResponse
    {
        // Only expose masked key presence and chain metadata — never secrets (NFR-SEC-005).
        $anthropicKey = config('ai.providers.anthropic.key');
        $transcriptionKey = config('ai.transcription.key');

        $providers = [
            [
                'key' => 'anthropic',
                'name' => 'Anthropic Claude',
                'configured' => filled($anthropicKey),
                'maskedKey' => $this->maskKey($anthropicKey),
                'models' => array_keys(config('ai.prices', [])),
                'chain' => config('ai.chain', []),
                'timeoutSeconds' => config('ai.timeout_seconds'),
            ],
            [
                'key' => 'transcription',
                'name' => 'Speech-to-Text (Whisper)',
                'configured' => filled(config('ai.transcription.url')) && filled($transcriptionKey),
                'maskedKey' => $this->maskKey($transcriptionKey),
                'models' => [config('ai.transcription.model', 'whisper-1')],
                'chain' => [],
                'timeoutSeconds' => config('ai.timeout_seconds'),
            ],
        ];

        $rateCards = AiRateCard::query()->orderBy('service_key')->orderBy('provider')->orderBy('model')->get()
            ->map(fn (AiRateCard $rc) => $this->presentRateCard($rc));

        return response()->json([
            'data' => [
                'providers' => $providers,
                'rateCards' => $rateCards,
                'services' => AiRateCard::DEFAULT_SERVICES,
            ],
        ]);
    }

    public function storeRateCard(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serviceKey' => ['required', 'string', 'max:60'],
            'provider' => ['required', 'string', 'max:60'],
            'model' => ['required', 'string', 'max:100'],
            'creditsPerRequest' => ['required', 'numeric', 'min:0'],
            'creditsPer1kTokens' => ['sometimes', 'numeric', 'min:0'],
            'usdPer1kInputTokens' => ['sometimes', 'numeric', 'min:0'],
            'usdPer1kOutputTokens' => ['sometimes', 'numeric', 'min:0'],
            'rateLimitPerMinute' => ['nullable', 'integer', 'min:1'],
            'warningThresholdPercent' => ['sometimes', 'integer', 'between:10,99'],
            'chargeOnFailure' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $card = AiRateCard::query()->updateOrCreate(
            ['service_key' => $data['serviceKey'], 'provider' => $data['provider'], 'model' => $data['model']],
            [
                'credits_per_request' => $data['creditsPerRequest'],
                'credits_per_1k_tokens' => $data['creditsPer1kTokens'] ?? 0,
                'usd_per_1k_input_tokens' => $data['usdPer1kInputTokens'] ?? 0,
                'usd_per_1k_output_tokens' => $data['usdPer1kOutputTokens'] ?? 0,
                'rate_limit_per_minute' => $data['rateLimitPerMinute'] ?? null,
                'warning_threshold_percent' => $data['warningThresholdPercent'] ?? 80,
                'charge_on_failure' => (bool) ($data['chargeOnFailure'] ?? false),
                'is_active' => (bool) ($data['isActive'] ?? true),
            ]
        );

        $this->audit->record('owner.ai_rate_card_saved', $card, [], ['serviceKey' => $card->service_key, 'model' => $card->model, 'creditsPerRequest' => $card->credits_per_request], $request->user());

        return response()->json(['data' => $this->presentRateCard($card)], 201);
    }

    public function updateRateCard(Request $request, AiRateCard $rateCard): JsonResponse
    {
        $data = $request->validate([
            'creditsPerRequest' => ['sometimes', 'numeric', 'min:0'],
            'creditsPer1kTokens' => ['sometimes', 'numeric', 'min:0'],
            'rateLimitPerMinute' => ['nullable', 'integer', 'min:1'],
            'warningThresholdPercent' => ['sometimes', 'integer', 'between:10,99'],
            'chargeOnFailure' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $before = $rateCard->only(['credits_per_request', 'credits_per_1k_tokens', 'charge_on_failure', 'is_active']);
        $rateCard->update([
            ...(array_key_exists('creditsPerRequest', $data) ? ['credits_per_request' => $data['creditsPerRequest']] : []),
            ...(array_key_exists('creditsPer1kTokens', $data) ? ['credits_per_1k_tokens' => $data['creditsPer1kTokens']] : []),
            ...(array_key_exists('rateLimitPerMinute', $data) ? ['rate_limit_per_minute' => $data['rateLimitPerMinute']] : []),
            ...(array_key_exists('warningThresholdPercent', $data) ? ['warning_threshold_percent' => $data['warningThresholdPercent']] : []),
            ...(array_key_exists('chargeOnFailure', $data) ? ['charge_on_failure' => $data['chargeOnFailure']] : []),
            ...(array_key_exists('isActive', $data) ? ['is_active' => $data['isActive']] : []),
        ]);

        $this->audit->record('owner.ai_rate_card_saved', $rateCard, $before, $rateCard->only(array_keys($before)), $request->user());

        return response()->json(['data' => $this->presentRateCard($rateCard)]);
    }

    /** @return array<string, mixed> */
    private function presentWallet(AiCreditWallet $w): array
    {
        return [
            'id' => $w->id,
            'institution' => $w->institution ? ['id' => $w->institution->id, 'name' => $w->institution->name, 'code' => $w->institution->code, 'status' => $w->institution->status] : null,
            'balance' => $w->balance,
            'allocatedTotal' => $w->allocated_total,
            'consumedTotal' => $w->consumed_total,
            'usedPercent' => $w->usedPercent(),
            'monthlyQuota' => $w->monthly_quota,
            'warningThresholdPercent' => $w->warning_threshold_percent,
            'hardStopOnExhaustion' => $w->hard_stop_on_exhaustion,
            'chargeFailedRequests' => $w->charge_failed_requests,
            'thresholdExceeded' => $w->allocated_total > 0 && $w->usedPercent() >= $w->warning_threshold_percent,
            'lastActivityAt' => $w->last_activity_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentRateCard(AiRateCard $rc): array
    {
        return [
            'id' => $rc->id,
            'serviceKey' => $rc->service_key,
            'provider' => $rc->provider,
            'model' => $rc->model,
            'creditsPerRequest' => $rc->credits_per_request,
            'creditsPer1kTokens' => $rc->credits_per_1k_tokens,
            'usdPer1kInputTokens' => $rc->usd_per_1k_input_tokens,
            'usdPer1kOutputTokens' => $rc->usd_per_1k_output_tokens,
            'rateLimitPerMinute' => $rc->rate_limit_per_minute,
            'warningThresholdPercent' => $rc->warning_threshold_percent,
            'chargeOnFailure' => $rc->charge_on_failure,
            'isActive' => $rc->is_active,
        ];
    }

    private function maskKey(?string $key): ?string
    {
        if (! $key || strlen($key) < 8) {
            return $key ? '****' : null;
        }

        return substr($key, 0, 4).str_repeat('*', 8).substr($key, -4);
    }
}

