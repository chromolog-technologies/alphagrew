<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\TaxProfile;
use App\Services\Audit\AuditLogger;
use App\Services\Owner\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Billing, invoices, idempotent payment reconciliation, refund approvals, tax/GST & coupons (SRS §5.8).
 */
class OwnerBillingController extends Controller
{
    public function __construct(
        private readonly BillingService $billing,
        private readonly AuditLogger $audit,
    ) {
    }

    public function invoices(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Invoice::STATUSES)],
            'institutionId' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $page = Invoice::query()
            ->with(['institution:id,name,code', 'items'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['institutionId'] ?? null, fn ($q, int $id) => $q->where('institution_id', $id))
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->where(fn ($sub) => $sub
                ->where('invoice_number', 'like', "%{$s}%")
                ->orWhereHas('institution', fn ($iq) => $iq->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%"))))
            ->latest('id')
            ->paginate($filters['perPage'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (Invoice $invoice) => $this->presentInvoice($invoice)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionId' => ['required', 'integer', 'exists:institutions,id'],
            'subscriptionId' => ['nullable', 'integer', 'exists:subscriptions,id'],
            'taxProfileId' => ['nullable', 'integer', 'exists:tax_profiles,id'],
            'couponCode' => ['nullable', 'string', 'max:50'],
            'currency' => ['sometimes', 'string', 'size:3', 'regex:/^[A-Za-z]{3}$/'],
            'billingPeriodStart' => ['nullable', 'date'],
            'billingPeriodEnd' => ['nullable', 'date'],
            'dueAt' => ['nullable', 'date'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'placeOfSupply' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
            'issueImmediately' => ['sometimes', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['sometimes', 'numeric', 'min:0.01'],
            'items.*.unitPrice' => ['required', 'numeric', 'min:0'],
            'items.*.itemType' => ['sometimes', Rule::in(InvoiceItem::ITEM_TYPES)],
        ]);

        $invoice = $this->billing->createInvoice($data, $request->user());

        return response()->json(['data' => $this->presentInvoice($invoice, includeRelations: true)], 201);
    }

    public function showInvoice(Invoice $invoice): JsonResponse
    {
        $invoice->load(['institution:id,name,code,official_email,state,address', 'items', 'payments', 'refunds', 'taxProfile', 'coupon']);

        return response()->json(['data' => $this->presentInvoice($invoice, includeRelations: true)]);
    }

    public function issueInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $updated = $this->billing->issueInvoice($invoice, $request->user());

        return response()->json(['data' => $this->presentInvoice($updated, includeRelations: true)]);
    }

    public function voidInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:300']])['reason'] ?? null;
        $updated = $this->billing->voidInvoice($invoice, $request->user(), $reason);

        return response()->json(['data' => $this->presentInvoice($updated, includeRelations: true)]);
    }

    public function downloadInvoice(Request $request, Invoice $invoice): Response
    {
        $this->audit->record('owner.invoice_downloaded', $invoice, [], ['invoiceNumber' => $invoice->invoice_number], $request->user(), $invoice->institution_id);
        $html = $this->billing->renderInvoiceHtml($invoice);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"invoice-{$invoice->invoice_number}.html\"",
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Payment::STATUSES)],
            'institutionId' => ['nullable', 'integer'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $page = Payment::query()
            ->with(['invoice:id,invoice_number,total,balance', 'institution:id,name,code'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['institutionId'] ?? null, fn ($q, int $id) => $q->where('institution_id', $id))
            ->latest('id')
            ->paginate($filters['perPage'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (Payment $p) => $this->presentPayment($p)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function recordPayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoiceId' => ['required', 'integer', 'exists:invoices,id'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'gateway' => ['sometimes', 'string', 'max:50'],
            'method' => ['sometimes', 'string', 'max:50'],
            'status' => ['sometimes', Rule::in(['pending', 'succeeded', 'failed'])],
            'paymentReference' => ['nullable', 'string', 'max:120'],
            'gatewayEventId' => ['nullable', 'string', 'max:120'],
            'failureReason' => ['nullable', 'string', 'max:255'],
            'paidAt' => ['nullable', 'date'],
            'payload' => ['nullable', 'array'],
        ]);

        $result = $this->billing->recordPayment($data, $request->user());

        return response()->json([
            'data' => $this->presentPayment($result['payment']),
            'duplicate' => $result['duplicate'],
        ], $result['duplicate'] ? 200 : 201);
    }

    public function handleWebhook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoiceId' => ['required', 'integer', 'exists:invoices,id'],
            'gatewayEventId' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'gateway' => ['required', 'string', 'max:50'],
            'method' => ['sometimes', 'string', 'max:50'],
            'status' => ['required', Rule::in(['succeeded', 'failed'])],
            'paymentReference' => ['nullable', 'string', 'max:120'],
            'failureReason' => ['nullable', 'string', 'max:255'],
            'payload' => ['nullable', 'array'],
        ]);

        $result = $this->billing->recordPayment($data, $request->user());

        return response()->json([
            'data' => $this->presentPayment($result['payment']),
            'duplicate' => $result['duplicate'],
        ], $result['duplicate'] ? 200 : 201);
    }

    public function refunds(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Refund::STATUSES)],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $page = Refund::query()
            ->with(['payment:id,payment_reference,amount', 'invoice:id,invoice_number', 'institution:id,name,code', 'requester:id,name'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->latest('id')
            ->paginate($filters['perPage'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (Refund $r) => $this->presentRefund($r)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function requestRefund(Request $request): JsonResponse
    {
        $data = $request->validate([
            'paymentId' => ['required', 'integer', 'exists:payments,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $payment = Payment::query()->findOrFail((int) $data['paymentId']);
        $refund = $this->billing->requestRefund($payment, (float) $data['amount'], $data['reason'], $request->user());

        return response()->json(['data' => $this->presentRefund($refund)], 201);
    }

    public function approveRefund(Request $request, Refund $refund): JsonResponse
    {
        return response()->json(['data' => $this->presentRefund($this->billing->approveRefund($refund, $request->user()))]);
    }

    public function rejectRefund(Request $request, Refund $refund): JsonResponse
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:500']])['reason'];

        return response()->json(['data' => $this->presentRefund($this->billing->rejectRefund($refund, $reason, $request->user()))]);
    }

    public function executeRefund(Request $request, Refund $refund): JsonResponse
    {
        $ref = $request->validate(['gatewayRefundReference' => ['nullable', 'string', 'max:120']])['gatewayRefundReference'] ?? null;

        return response()->json(['data' => $this->presentRefund($this->billing->executeRefund($refund, $request->user(), $ref))]);
    }

    public function revenueSummary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : null;
        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : null;

        return response()->json(['data' => $this->billing->revenueSummary($from, $to)]);
    }

    public function taxProfiles(): JsonResponse
    {
        return response()->json(['data' => TaxProfile::query()->orderByDesc('is_default')->orderBy('name')->get()->map(fn (TaxProfile $t) => [
            'id' => $t->id,
            'code' => $t->code,
            'name' => $t->name,
            'taxType' => $t->tax_type,
            'ratePercent' => $t->rate_percent,
            'gstin' => $t->gstin,
            'placeOfSupply' => $t->place_of_supply,
            'isDefault' => $t->is_default,
            'isActive' => $t->is_active,
        ])]);
    }

    public function storeTaxProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:tax_profiles,code'],
            'name' => ['required', 'string', 'max:120'],
            'taxType' => ['required', Rule::in(TaxProfile::TYPES)],
            'ratePercent' => ['required', 'numeric', 'between:0,100'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'placeOfSupply' => ['nullable', 'string', 'max:120'],
            'isDefault' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        if ($data['isDefault'] ?? false) {
            TaxProfile::query()->update(['is_default' => false]);
        }

        $profile = TaxProfile::query()->create([
            'code' => strtoupper($data['code']),
            'name' => $data['name'],
            'tax_type' => $data['taxType'],
            'rate_percent' => $data['ratePercent'],
            'gstin' => $data['gstin'] ?? null,
            'place_of_supply' => $data['placeOfSupply'] ?? null,
            'is_default' => (bool) ($data['isDefault'] ?? false),
            'is_active' => (bool) ($data['isActive'] ?? true),
        ]);

        $this->audit->record('owner.tax_profile_created', $profile, [], ['code' => $profile->code, 'ratePercent' => $profile->rate_percent], $request->user());

        return response()->json(['data' => [
            'id' => $profile->id, 'code' => $profile->code, 'name' => $profile->name, 'taxType' => $profile->tax_type,
            'ratePercent' => $profile->rate_percent, 'gstin' => $profile->gstin, 'placeOfSupply' => $profile->place_of_supply,
            'isDefault' => $profile->is_default, 'isActive' => $profile->is_active,
        ]], 201);
    }

    public function updateTaxProfile(Request $request, TaxProfile $taxProfile): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'taxType' => ['sometimes', Rule::in(TaxProfile::TYPES)],
            'ratePercent' => ['sometimes', 'numeric', 'between:0,100'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'placeOfSupply' => ['nullable', 'string', 'max:120'],
            'isDefault' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        if ($data['isDefault'] ?? false) {
            TaxProfile::query()->whereKeyNot($taxProfile->id)->update(['is_default' => false]);
        }

        $taxProfile->update([
            ...($data['name'] ?? null ? ['name' => $data['name']] : []),
            ...($data['taxType'] ?? null ? ['tax_type' => $data['taxType']] : []),
            ...(array_key_exists('ratePercent', $data) ? ['rate_percent' => $data['ratePercent']] : []),
            ...(array_key_exists('gstin', $data) ? ['gstin' => $data['gstin']] : []),
            ...(array_key_exists('placeOfSupply', $data) ? ['place_of_supply' => $data['placeOfSupply']] : []),
            ...(array_key_exists('isDefault', $data) ? ['is_default' => $data['isDefault']] : []),
            ...(array_key_exists('isActive', $data) ? ['is_active' => $data['isActive']] : []),
        ]);

        return response()->json(['data' => [
            'id' => $taxProfile->id, 'code' => $taxProfile->code, 'name' => $taxProfile->name, 'taxType' => $taxProfile->tax_type,
            'ratePercent' => $taxProfile->rate_percent, 'gstin' => $taxProfile->gstin, 'placeOfSupply' => $taxProfile->place_of_supply,
            'isDefault' => $taxProfile->is_default, 'isActive' => $taxProfile->is_active,
        ]]);
    }

    public function coupons(): JsonResponse
    {
        return response()->json(['data' => Coupon::query()->latest('id')->get()->map(fn (Coupon $c) => [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'discountType' => $c->discount_type,
            'discountValue' => $c->discount_value,
            'currency' => $c->currency,
            'maxRedemptions' => $c->max_redemptions,
            'redemptionsCount' => $c->redemptions_count,
            'validFrom' => $c->valid_from?->toIso8601String(),
            'validUntil' => $c->valid_until?->toIso8601String(),
            'isActive' => $c->is_active,
        ])]);
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:coupons,code'],
            'name' => ['required', 'string', 'max:120'],
            'discountType' => ['required', Rule::in(Coupon::TYPES)],
            'discountValue' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'maxRedemptions' => ['nullable', 'integer', 'min:1'],
            'validFrom' => ['nullable', 'date'],
            'validUntil' => ['nullable', 'date'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $coupon = Coupon::query()->create([
            'code' => strtoupper($data['code']),
            'name' => $data['name'],
            'discount_type' => $data['discountType'],
            'discount_value' => $data['discountValue'],
            'currency' => isset($data['currency']) ? strtoupper($data['currency']) : null,
            'max_redemptions' => $data['maxRedemptions'] ?? null,
            'valid_from' => $data['validFrom'] ?? null,
            'valid_until' => $data['validUntil'] ?? null,
            'is_active' => (bool) ($data['isActive'] ?? true),
        ]);

        $this->audit->record('owner.coupon_created', $coupon, [], ['code' => $coupon->code], $request->user());

        return response()->json(['data' => [
            'id' => $coupon->id, 'code' => $coupon->code, 'name' => $coupon->name, 'discountType' => $coupon->discount_type,
            'discountValue' => $coupon->discount_value, 'currency' => $coupon->currency, 'maxRedemptions' => $coupon->max_redemptions,
            'redemptionsCount' => $coupon->redemptions_count, 'validFrom' => $coupon->valid_from?->toIso8601String(),
            'validUntil' => $coupon->valid_until?->toIso8601String(), 'isActive' => $coupon->is_active,
        ]], 201);
    }

    public function updateCoupon(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'isActive' => ['sometimes', 'boolean'],
            'maxRedemptions' => ['nullable', 'integer', 'min:1'],
            'validUntil' => ['nullable', 'date'],
        ]);

        $coupon->update([
            ...(isset($data['name']) ? ['name' => $data['name']] : []),
            ...(array_key_exists('isActive', $data) ? ['is_active' => $data['isActive']] : []),
            ...(array_key_exists('maxRedemptions', $data) ? ['max_redemptions' => $data['maxRedemptions']] : []),
            ...(array_key_exists('validUntil', $data) ? ['valid_until' => $data['validUntil']] : []),
        ]);

        return response()->json(['data' => [
            'id' => $coupon->id, 'code' => $coupon->code, 'name' => $coupon->name, 'discountType' => $coupon->discount_type,
            'discountValue' => $coupon->discount_value, 'currency' => $coupon->currency, 'maxRedemptions' => $coupon->max_redemptions,
            'redemptionsCount' => $coupon->redemptions_count, 'validFrom' => $coupon->valid_from?->toIso8601String(),
            'validUntil' => $coupon->valid_until?->toIso8601String(), 'isActive' => $coupon->is_active,
        ]]);
    }

    /** @return array<string, mixed> */
    private function presentInvoice(Invoice $invoice, bool $includeRelations = false): array
    {
        return [
            'id' => $invoice->id,
            'invoiceNumber' => $invoice->invoice_number,
            'institution' => $invoice->institution ? ['id' => $invoice->institution->id, 'name' => $invoice->institution->name, 'code' => $invoice->institution->code] : null,
            'subscriptionId' => $invoice->subscription_id,
            'status' => $invoice->status,
            'currency' => $invoice->currency,
            'billingPeriodStart' => $invoice->billing_period_start?->toDateString(),
            'billingPeriodEnd' => $invoice->billing_period_end?->toDateString(),
            'issuedAt' => $invoice->issued_at?->toIso8601String(),
            'dueAt' => $invoice->due_at?->toDateString(),
            'subtotal' => $invoice->subtotal,
            'discountAmount' => $invoice->discount_amount,
            'taxRatePercent' => $invoice->tax_rate_percent,
            'taxAmount' => $invoice->tax_amount,
            'total' => $invoice->total,
            'paidAmount' => $invoice->paid_amount,
            'balance' => $invoice->balance,
            'gstin' => $invoice->gstin,
            'placeOfSupply' => $invoice->place_of_supply,
            'notes' => $invoice->notes,
            'items' => $invoice->items->map(fn (InvoiceItem $i) => [
                'id' => $i->id, 'description' => $i->description, 'quantity' => $i->quantity,
                'unitPrice' => $i->unit_price, 'amount' => $i->amount, 'itemType' => $i->item_type,
            ])->values(),
            ...($includeRelations ? [
                'payments' => $invoice->payments->map(fn (Payment $p) => $this->presentPayment($p))->values(),
                'refunds' => $invoice->refunds->map(fn (Refund $r) => $this->presentRefund($r))->values(),
            ] : []),
            'createdAt' => $invoice->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentPayment(Payment $p): array
    {
        return [
            'id' => $p->id,
            'invoiceId' => $p->invoice_id,
            'invoiceNumber' => $p->invoice?->invoice_number,
            'institution' => $p->institution ? ['id' => $p->institution->id, 'name' => $p->institution->name, 'code' => $p->institution->code] : null,
            'paymentReference' => $p->payment_reference,
            'gateway' => $p->gateway,
            'method' => $p->method,
            'amount' => $p->amount,
            'refundedAmount' => $p->refunded_amount,
            'refundableAmount' => $p->refundableAmount(),
            'currency' => $p->currency,
            'status' => $p->status,
            'gatewayEventId' => $p->gateway_event_id,
            'failureReason' => $p->failure_reason,
            'paidAt' => $p->paid_at?->toIso8601String(),
            'createdAt' => $p->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentRefund(Refund $r): array
    {
        return [
            'id' => $r->id,
            'paymentId' => $r->payment_id,
            'paymentReference' => $r->payment?->payment_reference,
            'invoiceId' => $r->invoice_id,
            'invoiceNumber' => $r->invoice?->invoice_number,
            'institution' => $r->institution ? ['id' => $r->institution->id, 'name' => $r->institution->name, 'code' => $r->institution->code] : null,
            'amount' => $r->amount,
            'currency' => $r->currency,
            'reason' => $r->reason,
            'status' => $r->status,
            'gatewayRefundReference' => $r->gateway_refund_reference,
            'requestedBy' => $r->requester?->name,
            'rejectionReason' => $r->rejection_reason,
            'approvedAt' => $r->approved_at?->toIso8601String(),
            'executedAt' => $r->executed_at?->toIso8601String(),
            'createdAt' => $r->created_at?->toIso8601String(),
        ];
    }
}

