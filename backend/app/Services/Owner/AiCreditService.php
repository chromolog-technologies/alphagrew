<?php

namespace App\Services\Owner;

use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\AiRateCard;
use App\Models\AiUsageLog;
use App\Models\Institution;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Institution AI credit wallets, append-only ledger and usage metering (SRS §5.9).
 * Wallet balances are maintained atomically alongside posted AiCreditTransaction rows
 * and can be reconciled at any time from SUM(credits_delta).
 */
class AiCreditService
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function walletFor(int $institutionId): AiCreditWallet
    {
        return AiCreditWallet::query()->firstOrCreate(
            ['institution_id' => $institutionId],
            [
                'balance' => 0,
                'allocated_total' => 0,
                'consumed_total' => 0,
                'warning_threshold_percent' => 80,
                'hard_stop_on_exhaustion' => false,
                'charge_failed_requests' => false,
            ]
        );
    }

    /**
     * Posts a signed ledger transaction and recalculates wallet balance inside a lock.
     * Positive delta = credit; negative delta = debit.
     */
    public function postTransaction(
        int $institutionId,
        string $type,
        float $delta,
        ?User $actor = null,
        ?string $reason = null,
        ?string $sourceType = null,
        ?int $sourceId = null,
        ?Carbon $expiresAt = null,
        ?string $idempotencyKey = null,
        bool $allowNegative = true,
    ): AiCreditTransaction {
        $roundedDelta = round($delta, 2);
        if ($roundedDelta === 0.0) {
            throw ValidationException::withMessages(['credits' => ['Credit adjustment cannot be zero.']]);
        }

        if ($idempotencyKey) {
            $existing = AiCreditTransaction::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        return DB::transaction(function () use (
            $institutionId, $type, $roundedDelta, $actor, $reason, $sourceType, $sourceId, $expiresAt, $idempotencyKey, $allowNegative
        ): AiCreditTransaction {
            // Ensure wallet row exists before acquiring the row lock.
            $wallet = $this->walletFor($institutionId);
            $wallet = AiCreditWallet::query()->whereKey($wallet->id)->lockForUpdate()->firstOrFail();

            $nextBalance = round($wallet->balance + $roundedDelta, 2);
            if (! $allowNegative && $nextBalance < 0) {
                throw ValidationException::withMessages(['credits' => ['Insufficient credit balance for this deduction.']]);
            }

            if ($roundedDelta > 0) {
                $wallet->allocated_total = round($wallet->allocated_total + $roundedDelta, 2);
            } else {
                $wallet->consumed_total = round($wallet->consumed_total + abs($roundedDelta), 2);
            }

            $wallet->balance = $nextBalance;
            $wallet->last_activity_at = now();
            $wallet->save();

            $tx = AiCreditTransaction::query()->create([
                'wallet_id' => $wallet->id,
                'institution_id' => $institutionId,
                'transaction_type' => $type,
                'credits_delta' => $roundedDelta,
                'balance_after' => $nextBalance,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'idempotency_key' => $idempotencyKey,
                'reason' => $reason,
                'expires_at' => $expiresAt,
                'actor_id' => $actor?->id,
                'created_at' => now(),
            ]);

            if (in_array($type, ['manual_adjustment', 'bonus', 'purchased', 'reversal', 'expiry'], true) && $actor) {
                $this->audit->record(
                    'owner.ai_credit_adjusted',
                    $wallet,
                    ['balance' => round($wallet->balance - $roundedDelta, 2)],
                    ['transactionType' => $type, 'delta' => $roundedDelta, 'balance' => $nextBalance, 'reason' => $reason],
                    $actor,
                    $institutionId
                );
            }

            return $tx;
        });
    }

    /**
     * Updates wallet quota and alert policy without modifying balance.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePolicy(int $institutionId, array $data, User $actor): AiCreditWallet
    {
        $wallet = $this->walletFor($institutionId);
        $before = $wallet->only(['monthly_quota', 'warning_threshold_percent', 'hard_stop_on_exhaustion', 'charge_failed_requests']);
        $wallet->fill([
            'monthly_quota' => array_key_exists('monthlyQuota', $data) ? $data['monthlyQuota'] : $wallet->monthly_quota,
            'warning_threshold_percent' => $data['warningThresholdPercent'] ?? $wallet->warning_threshold_percent,
            'hard_stop_on_exhaustion' => $data['hardStopOnExhaustion'] ?? $wallet->hard_stop_on_exhaustion,
            'charge_failed_requests' => $data['chargeFailedRequests'] ?? $wallet->charge_failed_requests,
        ])->save();

        $this->audit->record('owner.ai_wallet_policy_updated', $wallet, $before, $wallet->only(array_keys($before)), $actor, $institutionId);

        return $wallet->fresh();
    }

    /**
     * Meters an AiUsageLog entry against active rate cards and debits the institution wallet.
     * Failed requests are never charged unless explicitly configured (SRS FR-AI-008).
     */
    public function meterUsage(AiUsageLog $log): void
    {
        if (! $log->institution_id || ! Institution::query()->whereKey($log->institution_id)->exists()) {
            return;
        }

        $rateCard = $this->resolveRateCard($log->feature, $log->provider, $log->model);
        $wallet = $this->walletFor((int) $log->institution_id);

        $isSuccess = $log->status === 'success';
        $chargeFailed = $wallet->charge_failed_requests || ($rateCard?->charge_on_failure ?? false);

        if (! $isSuccess && ! $chargeFailed) {
            $log->update(['credits_charged' => 0, 'rate_card_id' => $rateCard?->id]);

            return;
        }

        $totalTokens = (int) $log->prompt_tokens + (int) $log->completion_tokens;
        $credits = $rateCard ? $rateCard->creditsForCall($totalTokens) : 1.00;
        if ($credits <= 0) {
            $log->update(['credits_charged' => 0, 'rate_card_id' => $rateCard?->id]);

            return;
        }

        $log->update([
            'credits_charged' => $credits,
            'rate_card_id' => $rateCard?->id,
        ]);

        $this->postTransaction(
            institutionId: (int) $log->institution_id,
            type: 'usage_debit',
            delta: -$credits,
            reason: "AI {$log->feature} ({$log->model})",
            sourceType: AiUsageLog::class,
            sourceId: $log->id,
            idempotencyKey: "usage_log_{$log->id}",
            allowNegative: true,
        );
    }

    public function resolveRateCard(string $feature, string $provider, string $model): ?AiRateCard
    {
        return AiRateCard::query()
            ->where('is_active', true)
            ->where('service_key', $feature)
            ->orderByRaw("CASE WHEN provider = ? AND model = ? THEN 1 WHEN provider = ? AND model = '*' THEN 2 ELSE 3 END", [$provider, $model, $provider])
            ->first();
    }
}

