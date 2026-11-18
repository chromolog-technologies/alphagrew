<?php

namespace App\Services\Owner;

use App\Models\Coupon;
use App\Models\Institution;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\PlatformSetting;
use App\Models\Refund;
use App\Models\Subscription;
use App\Models\TaxProfile;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Invoicing, idempotent payment reconciliation, two-step refunds, tax/GST calculation and
 * revenue reporting (SRS §5.8 & §6). All money arithmetic uses integer minor units (cents/paise).
 */
class BillingService
{
    private const PAYLOAD_REDACTED_KEYS = [
        'card', 'card_number', 'cvv', 'cvc', 'security_code', 'secret', 'signature', 'token', 'key', 'password',
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly InstitutionLifecycle $lifecycle,
    ) {
    }

    /** @param array<string, mixed> $data */
    public function createInvoice(array $data, ?User $actor = null): Invoice
    {
        return DB::transaction(function () use ($data, $actor): Invoice {
            $institution = Institution::query()->findOrFail((int) $data['institutionId']);
            $currency = strtoupper((string) ($data['currency'] ?? PlatformSetting::get('currency') ?? 'INR'));
            $subscription = isset($data['subscriptionId']) && $data['subscriptionId']
                ? Subscription::query()->where('institution_id', $institution->id)->findOrFail((int) $data['subscriptionId'])
                : null;

            $taxProfile = $this->resolveTaxProfile(isset($data['taxProfileId']) && $data['taxProfileId'] ? (int) $data['taxProfileId'] : null);
            $coupon = $this->resolveCoupon(isset($data['couponCode']) ? (string) $data['couponCode'] : null, $currency);

            $rawItems = $data['items'] ?? [];
            if ($rawItems === []) {
                throw ValidationException::withMessages(['items' => ['Add at least one invoice line item.']]);
            }

            $subtotalCents = 0;
            $preparedItems = [];
            foreach ($rawItems as $item) {
                $qty = round((float) ($item['quantity'] ?? 1), 2);
                $unitCents = $this->toCents($item['unitPrice'] ?? 0);
                $lineCents = (int) round($qty * $unitCents);
                $subtotalCents += $lineCents;
                $preparedItems[] = [
                    'description' => trim((string) $item['description']),
                    'quantity' => $qty,
                    'unit_price' => $this->fromCents($unitCents),
                    'amount' => $this->fromCents($lineCents),
                    'item_type' => $item['itemType'] ?? 'subscription',
                    'created_at' => now(),
                ];
            }

            $discountCents = $coupon ? $coupon->discountCentsFor($subtotalCents) : 0;
            $taxableCents = max(0, $subtotalCents - $discountCents);
            $taxRate = $taxProfile ? (float) $taxProfile->rate_percent : 0.0;
            $taxCents = (int) round($taxableCents * ($taxRate / 100));
            $totalCents = $taxableCents + $taxCents;

            $issueNow = (bool) ($data['issueImmediately'] ?? true);
            $periodStart = Carbon::parse($data['billingPeriodStart'] ?? now()->startOfMonth())->startOfDay();
            $periodEnd = Carbon::parse($data['billingPeriodEnd'] ?? $periodStart->copy()->addMonth()->subDay())->startOfDay();
            if ($periodEnd->lt($periodStart)) {
                throw ValidationException::withMessages(['billingPeriodEnd' => ['Billing period end must not precede start.']]);
            }

            $invoice = Invoice::query()->create([
                'invoice_number' => $this->nextInvoiceNumber(),
                'institution_id' => $institution->id,
                'subscription_id' => $subscription?->id,
                'tax_profile_id' => $taxProfile?->id,
                'coupon_id' => $coupon?->id,
                'status' => $issueNow ? 'issued' : 'draft',
                'currency' => $currency,
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end' => $periodEnd->toDateString(),
                'issued_at' => $issueNow ? now() : null,
                'due_at' => Carbon::parse($data['dueAt'] ?? now()->addDays(15))->toDateString(),
                'subtotal' => $this->fromCents($subtotalCents),
                'discount_amount' => $this->fromCents($discountCents),
                'tax_rate_percent' => round($taxRate, 2),
                'tax_amount' => $this->fromCents($taxCents),
                'total' => $this->fromCents($totalCents),
                'paid_amount' => 0,
                'balance' => $this->fromCents($totalCents),
                'gstin' => $data['gstin'] ?? $taxProfile?->gstin,
                'place_of_supply' => $data['placeOfSupply'] ?? $taxProfile?->place_of_supply ?? $institution->state,
                'notes' => isset($data['notes']) ? trim((string) $data['notes']) : null,
                'created_by' => $actor?->id,
            ]);

            $invoice->items()->createMany($preparedItems);

            if ($coupon) {
                $coupon->increment('redemptions_count');
            }

            $this->audit->record('owner.invoice_created', $invoice, [], [
                'invoiceNumber' => $invoice->invoice_number,
                'total' => $invoice->total,
                'currency' => $invoice->currency,
                'status' => $invoice->status,
            ], $actor, $institution->id);

            return $invoice->fresh(['institution:id,name,code,official_email,state,address', 'items', 'payments', 'taxProfile', 'coupon']);
        });
    }

    public function issueInvoice(Invoice $invoice, User $actor): Invoice
    {
        if ($invoice->status !== 'draft') {
            throw ValidationException::withMessages(['status' => ['Only draft invoices can be issued.']]);
        }

        $invoice->update(['status' => 'issued', 'issued_at' => now()]);
        $this->audit->record('owner.invoice_issued', $invoice, ['status' => 'draft'], ['status' => 'issued'], $actor, $invoice->institution_id);

        return $invoice->fresh(['institution:id,name,code,official_email,state,address', 'items', 'payments', 'taxProfile', 'coupon']);
    }

    public function voidInvoice(Invoice $invoice, User $actor, ?string $reason = null): Invoice
    {
        if ($invoice->paid_amount > 0) {
            throw ValidationException::withMessages(['status' => ['Invoices with recorded payments cannot be voided; issue a refund instead.']]);
        }
        if ($invoice->status === 'void') {
            throw ValidationException::withMessages(['status' => ['Invoice is already void.']]);
        }

        $before = $invoice->status;
        $invoice->update(['status' => 'void', 'balance' => 0]);
        $this->audit->record('owner.invoice_voided', $invoice, ['status' => $before], ['status' => 'void', 'reason' => $reason], $actor, $invoice->institution_id);

        return $invoice->fresh(['institution:id,name,code,official_email,state,address', 'items', 'payments', 'taxProfile', 'coupon']);
    }

    /**
     * Records a payment or gateway webhook callback idempotently (SRS FR-BL-004).
     * Duplicate gateway_event_id values never double-credit an invoice.
     *
     * @param  array<string, mixed>  $data
     * @return array{payment: Payment, duplicate: bool}
     */
    public function recordPayment(array $data, ?User $actor = null): array
    {
        return DB::transaction(function () use ($data, $actor): array {
            $eventId = isset($data['gatewayEventId']) && trim((string) $data['gatewayEventId']) !== ''
                ? trim((string) $data['gatewayEventId'])
                : null;

            if ($eventId) {
                $existingEvent = PaymentEvent::query()->where('event_id', $eventId)->first();
                if ($existingEvent && $existingEvent->payment_id) {
                    return [
                        'payment' => Payment::query()->with(['invoice', 'institution:id,name,code'])->findOrFail($existingEvent->payment_id),
                        'duplicate' => true,
                    ];
                }
            }

            $invoice = Invoice::query()->whereKey((int) $data['invoiceId'])->lockForUpdate()->firstOrFail();
            if ($invoice->status === 'void') {
                throw ValidationException::withMessages(['invoiceId' => ['Cannot record payment on a void invoice.']]);
            }

            $status = $data['status'] ?? 'succeeded';
            $amountCents = $this->toCents($data['amount'] ?? $invoice->balance);
            if ($amountCents <= 0) {
                throw ValidationException::withMessages(['amount' => ['Payment amount must be greater than zero.']]);
            }

            if ($status === 'succeeded' && $amountCents > $this->toCents($invoice->balance)) {
                throw ValidationException::withMessages(['amount' => ['Payment exceeds invoice remaining balance ('.$invoice->balance.' '.$invoice->currency.').']]);
            }

            $payment = Payment::query()->create([
                'invoice_id' => $invoice->id,
                'institution_id' => $invoice->institution_id,
                'payment_reference' => $data['paymentReference'] ?? ('PAY-'.strtoupper(substr(md5(uniqid((string) $invoice->id, true)), 0, 10))),
                'gateway' => $data['gateway'] ?? 'manual',
                'method' => $data['method'] ?? 'bank_transfer',
                'amount' => $this->fromCents($amountCents),
                'currency' => $invoice->currency,
                'status' => $status,
                'refunded_amount' => 0,
                'gateway_event_id' => $eventId,
                'gateway_payload_reference' => $this->sanitizeGatewayPayload($data['payload'] ?? null),
                'failure_reason' => $status === 'failed' ? ($data['failureReason'] ?? 'Payment declined') : null,
                'paid_at' => $status === 'succeeded' ? Carbon::parse($data['paidAt'] ?? now()) : null,
                'recorded_by' => $actor?->id,
            ]);

            if ($eventId) {
                PaymentEvent::query()->create([
                    'payment_id' => $payment->id,
                    'event_id' => $eventId,
                    'gateway' => $payment->gateway,
                    'event_type' => "payment.{$status}",
                    'status' => 'processed',
                    'payload' => $this->sanitizeGatewayPayload($data['payload'] ?? ['invoiceNumber' => $invoice->invoice_number]),
                    'processed_at' => now(),
                ]);
            }

            if ($status === 'succeeded') {
                $this->applyPaymentToInvoice($invoice, $amountCents, $actor);
            } elseif ($status === 'failed' && $invoice->subscription_id) {
                $sub = $invoice->subscription;
                if ($sub && in_array($sub->status, ['trial', 'active'], true)) {
                    $sub->update([
                        'status' => 'past_due',
                        'grace_ends_at' => now()->addDays($sub->grace_days ?? 7),
                    ]);
                }
            }

            $this->audit->record('owner.payment_recorded', $payment, [], [
                'invoiceNumber' => $invoice->invoice_number,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'gateway' => $payment->gateway,
            ], $actor, $invoice->institution_id);

            return [
                'payment' => $payment->fresh(['invoice', 'institution:id,name,code']),
                'duplicate' => false,
            ];
        });
    }

    public function requestRefund(Payment $payment, float $amount, string $reason, User $actor): Refund
    {
        if (! in_array($payment->status, ['succeeded', 'partially_refunded'], true)) {
            throw ValidationException::withMessages(['payment' => ['Only succeeded payments can be refunded.']]);
        }

        $refundCents = $this->toCents($amount);
        $refundableCents = $this->toCents($payment->refundableAmount());
        if ($refundCents <= 0 || $refundCents > $refundableCents) {
            throw ValidationException::withMessages(['amount' => ['Refund amount exceeds remaining refundable balance ('.$payment->refundableAmount().').']]);
        }

        $refund = Refund::query()->create([
            'payment_id' => $payment->id,
            'invoice_id' => $payment->invoice_id,
            'institution_id' => $payment->institution_id,
            'amount' => $this->fromCents($refundCents),
            'currency' => $payment->currency,
            'reason' => trim($reason),
            'status' => 'requested',
            'requested_by' => $actor->id,
        ]);

        $this->audit->record('owner.refund_requested', $refund, [], ['amount' => $refund->amount, 'reason' => $refund->reason], $actor, $refund->institution_id);

        return $refund->fresh(['payment', 'invoice', 'institution:id,name,code', 'requester:id,name,email']);
    }

    public function approveRefund(Refund $refund, User $actor): Refund
    {
        if ($refund->status !== 'requested') {
            throw ValidationException::withMessages(['status' => ['Only requested refunds can be approved.']]);
        }

        $refund->update(['status' => 'approved', 'approved_by' => $actor->id, 'approved_at' => now()]);
        $this->audit->record('owner.refund_approved', $refund, ['status' => 'requested'], ['status' => 'approved'], $actor, $refund->institution_id);

        return $refund->fresh(['payment', 'invoice', 'institution:id,name,code']);
    }

    public function rejectRefund(Refund $refund, string $reason, User $actor): Refund
    {
        if (! in_array($refund->status, ['requested', 'approved'], true)) {
            throw ValidationException::withMessages(['status' => ['Only pending refunds can be rejected.']]);
        }

        $before = $refund->status;
        $refund->update(['status' => 'rejected', 'rejection_reason' => trim($reason), 'approved_by' => $actor->id, 'approved_at' => now()]);
        $this->audit->record('owner.refund_rejected', $refund, ['status' => $before], ['status' => 'rejected', 'reason' => $reason], $actor, $refund->institution_id);

        return $refund->fresh(['payment', 'invoice', 'institution:id,name,code']);
    }

    public function executeRefund(Refund $refund, User $actor, ?string $gatewayReference = null): Refund
    {
        if (! in_array($refund->status, ['requested', 'approved'], true)) {
            throw ValidationException::withMessages(['status' => ['Refund has already been finalized.']]);
        }

        return DB::transaction(function () use ($refund, $actor, $gatewayReference): Refund {
            $payment = Payment::query()->whereKey($refund->payment_id)->lockForUpdate()->firstOrFail();
            $invoice = Invoice::query()->whereKey($refund->invoice_id)->lockForUpdate()->firstOrFail();

            $refundCents = $this->toCents($refund->amount);
            $remainingCents = $this->toCents($payment->refundableAmount());
            if ($refundCents > $remainingCents) {
                throw ValidationException::withMessages(['amount' => ['Refund exceeds payment remaining refundable amount.']]);
            }

            $newRefundedCents = $this->toCents($payment->refunded_amount) + $refundCents;
            $paymentCents = $this->toCents($payment->amount);
            $payment->update([
                'refunded_amount' => $this->fromCents($newRefundedCents),
                'status' => $newRefundedCents >= $paymentCents ? 'refunded' : 'partially_refunded',
            ]);

            $newPaidCents = max(0, $this->toCents($invoice->paid_amount) - $refundCents);
            $totalCents = $this->toCents($invoice->total);
            $newBalanceCents = max(0, $totalCents - $newPaidCents);
            $invoice->update([
                'paid_amount' => $this->fromCents($newPaidCents),
                'balance' => $this->fromCents($newBalanceCents),
                'status' => $newPaidCents === 0 ? 'issued' : ($newBalanceCents > 0 ? 'partially_paid' : 'paid'),
            ]);

            $refund->update([
                'status' => 'executed',
                'approved_by' => $refund->approved_by ?? $actor->id,
                'approved_at' => $refund->approved_at ?? now(),
                'executed_by' => $actor->id,
                'executed_at' => now(),
                'gateway_refund_reference' => $gatewayReference ?? ('RFND-'.strtoupper(substr(md5((string) $refund->id.now()->timestamp), 0, 10))),
            ]);

            $this->audit->record('owner.refund_executed', $refund, [], [
                'amount' => $refund->amount,
                'invoiceNumber' => $invoice->invoice_number,
                'paymentRef' => $payment->payment_reference,
            ], $actor, $refund->institution_id);

            return $refund->fresh(['payment', 'invoice', 'institution:id,name,code']);
        });
    }

    /**
     * Distinguishes Invoiced, Collected (net of executed refunds), Outstanding balances,
     * MRR/ARR, Trial conversion and Churn (SRS §5.8 FR-BL-007 & §6).
     *
     * @return array<string, mixed>
     */
    public function revenueSummary(?Carbon $from = null, ?Carbon $to = null): array
    {
        $from ??= now()->subDays(30)->startOfDay();
        $to ??= now()->endOfDay();
        $currency = (string) PlatformSetting::get('currency');

        $activeSubs = Subscription::query()->with('plan:id,code,name')->where('status', 'active')->get();
        $mrr = round($activeSubs->sum(fn (Subscription $sub) => $sub->monthlyRecurringValue()), 2);
        $arr = round($mrr * 12, 2);

        $invoiced = round((float) Invoice::query()
            ->where('status', '!=', 'void')
            ->whereBetween('created_at', [$from, $to])
            ->sum('total'), 2);

        $grossCollected = (float) Payment::query()
            ->whereIn('status', ['succeeded', 'partially_refunded', 'refunded'])
            ->whereBetween('paid_at', [$from, $to])
            ->sum('amount');

        $refunded = round((float) Refund::query()
            ->where('status', 'executed')
            ->whereBetween('executed_at', [$from, $to])
            ->sum('amount'), 2);

        $collected = round(max(0.0, $grossCollected - $refunded), 2);

        $outstanding = round((float) Invoice::query()
            ->whereIn('status', ['issued', 'partially_paid', 'overdue'])
            ->sum('balance'), 2);

        $trialSubs = Subscription::query()->where('status', 'trial')->count();
        $pastDueSubs = Subscription::query()->where('status', 'past_due')->count();
        $cancelledInPeriod = Subscription::query()
            ->whereIn('status', ['cancelled', 'expired'])
            ->whereBetween('updated_at', [$from, $to])
            ->count();

        $totalTrialsStarted = Subscription::query()->whereNotNull('trial_start_at')->count();
        $convertedTrials = Subscription::query()->whereNotNull('trial_start_at')->where('status', 'active')->count();
        $trialConversionRate = $totalTrialsStarted > 0 ? round(($convertedTrials / $totalTrialsStarted) * 100, 1) : 0.0;

        $openingPaid = max(1, $activeSubs->count() + $cancelledInPeriod);
        $churnRate = $activeSubs->count() + $cancelledInPeriod > 0
            ? round(($cancelledInPeriod / $openingPaid) * 100, 1)
            : 0.0;

        $byPlan = $activeSubs->groupBy('plan_id')->map(function ($group) {
            $first = $group->first();

            return [
                'planId' => $first->plan_id,
                'planCode' => $first->plan?->code ?? 'CUSTOM',
                'planName' => $first->plan?->name ?? 'Plan',
                'subscriptions' => $group->count(),
                'mrr' => round($group->sum(fn (Subscription $sub) => $sub->monthlyRecurringValue()), 2),
            ];
        })->values()->all();

        $byInstitution = Invoice::query()
            ->with('institution:id,name,code')
            ->where('status', '!=', 'void')
            ->get()
            ->groupBy('institution_id')
            ->map(function ($rows) {
                $first = $rows->first();

                return [
                    'institutionId' => $first->institution_id,
                    'institutionName' => $first->institution?->name ?? 'Institution',
                    'code' => $first->institution?->code ?? '',
                    'invoiced' => round((float) $rows->sum('total'), 2),
                    'paid' => round((float) $rows->sum('paid_amount'), 2),
                    'outstanding' => round((float) $rows->sum('balance'), 2),
                ];
            })
            ->sortByDesc('invoiced')
            ->take(10)
            ->values()
            ->all();

        return [
            'currency' => $currency,
            'period' => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'mrr' => $mrr,
            'arr' => $arr,
            'invoiced' => $invoiced,
            'collected' => $collected,
            'refunded' => $refunded,
            'outstanding' => $outstanding,
            'subscriptions' => [
                'active' => $activeSubs->count(),
                'trial' => $trialSubs,
                'pastDue' => $pastDueSubs,
                'total' => Subscription::query()->count(),
                'trialConversionRate' => $trialConversionRate,
                'churnRate' => $churnRate,
            ],
            'byPlan' => $byPlan,
            'byInstitution' => $byInstitution,
        ];
    }

    /** Renders a self-contained HTML invoice / payment receipt for download/print (FR-BL-008). */
    public function renderInvoiceHtml(Invoice $invoice): string
    {
        $invoice->loadMissing(['institution', 'items', 'payments']);
        $platformName = e((string) PlatformSetting::get('platformName'));
        $currency = e($invoice->currency);
        $instName = e($invoice->institution?->name ?? 'Institution');
        $instCode = e($invoice->institution?->code ?? '');
        $rows = '';
        foreach ($invoice->items as $item) {
            $rows .= sprintf(
                '<tr><td>%s</td><td style="text-align:right">%.2f</td><td style="text-align:right">%s %.2f</td><td style="text-align:right">%s %.2f</td></tr>',
                e($item->description),
                $item->quantity,
                $currency,
                $item->unit_price,
                $currency,
                $item->amount,
            );
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Invoice {$invoice->invoice_number}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:40px auto;color:#0f172a;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.meta{display:flex;justify-content:space-between;margin-bottom:24px}.totals{margin-top:20px;margin-left:auto;width:300px}.totals td{border:none;padding:4px 8px}.badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#f1f5f9;font-size:12px;text-transform:uppercase}</style>
</head>
<body>
<div class="meta">
<div><h1 style="margin:0;font-size:22px">{$platformName}</h1><p style="margin:4px 0;color:#64748b">Invoice {$invoice->invoice_number}</p></div>
<div style="text-align:right"><span class="badge">{$invoice->status}</span><p style="margin:6px 0 0;color:#64748b">Due: {$invoice->due_at?->format('d M Y')}</p></div>
</div>
<p><strong>Billed To:</strong> {$instName} ({$instCode})<br>
<strong>Period:</strong> {$invoice->billing_period_start?->format('d M Y')} – {$invoice->billing_period_end?->format('d M Y')}
HTML
            .($invoice->gstin ? '<br><strong>GSTIN:</strong> '.e($invoice->gstin) : '')
            .($invoice->place_of_supply ? ' · <strong>Place of supply:</strong> '.e($invoice->place_of_supply) : '')
            .<<<HTML
</p>
<table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>{$rows}</tbody></table>
<table class="totals">
<tr><td>Subtotal</td><td style="text-align:right">{$currency} {$invoice->subtotal}</td></tr>
<tr><td>Discount</td><td style="text-align:right">- {$currency} {$invoice->discount_amount}</td></tr>
<tr><td>Tax ({$invoice->tax_rate_percent}%)</td><td style="text-align:right">{$currency} {$invoice->tax_amount}</td></tr>
<tr><td><strong>Total</strong></td><td style="text-align:right"><strong>{$currency} {$invoice->total}</strong></td></tr>
<tr><td>Paid</td><td style="text-align:right">{$currency} {$invoice->paid_amount}</td></tr>
<tr><td><strong>Balance Due</strong></td><td style="text-align:right"><strong>{$currency} {$invoice->balance}</strong></td></tr>
</table>
</body></html>
HTML;
    }

    private function applyPaymentToInvoice(Invoice $invoice, int $amountCents, ?User $actor): void
    {
        $newPaidCents = $this->toCents($invoice->paid_amount) + $amountCents;
        $totalCents = $this->toCents($invoice->total);
        $newBalanceCents = max(0, $totalCents - $newPaidCents);
        $newStatus = $newBalanceCents === 0 ? 'paid' : 'partially_paid';

        $invoice->update([
            'paid_amount' => $this->fromCents($newPaidCents),
            'balance' => $this->fromCents($newBalanceCents),
            'status' => $newStatus,
            'issued_at' => $invoice->issued_at ?? now(),
        ]);

        // Workflow 7.3: confirmed full payment restores a past_due subscription and suspended institution.
        if ($newStatus === 'paid' && $invoice->subscription_id) {
            $sub = $invoice->subscription;
            if ($sub && in_array($sub->status, ['trial', 'past_due'], true)) {
                $sub->update(['status' => 'active', 'grace_ends_at' => null]);
                $institution = $sub->institution;
                if ($institution && $institution->status === 'suspended' && $actor) {
                    $this->lifecycle->change($institution, 'active', $actor, "Invoice {$invoice->invoice_number} paid");
                }
            }
        }
    }

    private function resolveTaxProfile(?int $taxProfileId): ?TaxProfile
    {
        if ($taxProfileId) {
            return TaxProfile::query()->where('is_active', true)->findOrFail($taxProfileId);
        }

        return TaxProfile::query()->where('is_active', true)->where('is_default', true)->first();
    }

    private function resolveCoupon(?string $code, string $currency): ?Coupon
    {
        if (! $code || trim($code) === '') {
            return null;
        }

        $coupon = Coupon::query()->where('code', strtoupper(trim($code)))->first();
        if (! $coupon || ! $coupon->isRedeemable($currency)) {
            throw ValidationException::withMessages(['couponCode' => ['Coupon is invalid, expired, or ineligible for this currency.']]);
        }

        return $coupon;
    }

    private function nextInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ym').'-';
        $latest = Invoice::query()
            ->where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $seq = $latest ? ((int) substr($latest, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /** @return array<string, mixed>|null */
    private function sanitizeGatewayPayload(mixed $payload): ?array
    {
        if (! is_array($payload)) {
            return null;
        }

        return Arr::except($payload, self::PAYLOAD_REDACTED_KEYS);
    }

    private function toCents(float|int|string $value): int
    {
        return (int) round(((float) $value) * 100);
    }

    private function fromCents(int $cents): float
    {
        return round($cents / 100, 2);
    }
}
