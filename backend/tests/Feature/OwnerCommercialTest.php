<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\AiRateCard;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\PlatformRole;
use App\Models\User;
use App\Services\Ai\AiClient;
use App\Services\Ai\AiRequest;
use App\Services\Ai\JsonSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Owner Dashboard SRS Release 2: plans & versioning, subscriptions & trials,
 * billing/invoices/payments/idempotent webhooks/refunds/tax/coupons and AI credit ledger.
 */
class OwnerCommercialTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Cache::flush();
        $this->platformUser('owner@test.dev', UserRole::SuperAdmin, null);
        $this->platformUser('finance@test.dev', UserRole::PlatformStaff, 'finance-manager');
        $this->platformUser('support@test.dev', UserRole::PlatformStaff, 'support-manager');
    }

    public function test_commercial_permissions_enforce_platform_isolation_and_roles(): void
    {
        foreach (['/api/v1/owner/plans', '/api/v1/owner/subscriptions', '/api/v1/owner/invoices', '/api/v1/owner/ai/credits'] as $path) {
            $this->as('admin@demo.com')->getJson($path)->assertForbidden()->assertJsonPath('code', 'not_platform_user');
        }

        $this->as('support@test.dev')->getJson('/api/v1/owner/subscriptions')->assertOk();
        $this->as('support@test.dev')->getJson('/api/v1/owner/invoices')->assertForbidden()->assertJsonPath('code', 'owner_permission_denied');
        $this->as('support@test.dev')->postJson('/api/v1/owner/plans', ['code' => 'X1', 'name' => 'X1'])->assertForbidden();

        $this->as('finance@test.dev')->getJson('/api/v1/owner/invoices')->assertOk();
        $this->as('finance@test.dev')->postJson('/api/v1/owner/plans', [
            'code' => 'FIN_STARTER', 'name' => 'Finance Starter', 'status' => 'active', 'price' => 5000, 'currency' => 'INR',
        ])->assertCreated();
    }

    public function test_plans_create_new_versions_on_commercial_edits_and_protect_referenced_plans(): void
    {
        $created = $this->as('owner@test.dev')->postJson('/api/v1/owner/plans', [
            'code' => 'PRO_TIER',
            'name' => 'Pro Tier',
            'status' => 'active',
            'billingCycle' => 'monthly',
            'price' => 10000,
            'currency' => 'INR',
            'trialDays' => 14,
            'aiCreditAllocation' => 1000,
            'features' => ['placement' => true, 'ai_interviews' => true],
        ])->assertCreated()
            ->assertJsonPath('data.currentVersion.versionNumber', 1)
            ->json('data');

        $planId = $created['id'];
        $instId = Institution::defaultId();

        // Assign subscription to v1 before price change.
        $sub = $this->as('owner@test.dev')->postJson('/api/v1/owner/subscriptions', [
            'institutionId' => $instId,
            'planId' => $planId,
            'status' => 'active',
            'generateInvoice' => false,
        ])->assertCreated()
            ->assertJsonPath('data.planVersionNumber', 1)
            ->assertJsonPath('data.amount', 10000)
            ->json('data');

        // Updating price creates immutable v2; existing subscription keeps v1 terms.
        $this->as('owner@test.dev')->patchJson("/api/v1/owner/plans/{$planId}", [
            'price' => 12500,
            'aiCreditAllocation' => 2000,
        ])->assertOk()
            ->assertJsonPath('data.currentVersion.versionNumber', 2)
            ->assertJsonPath('data.currentVersion.price', 12500);

        $this->as('owner@test.dev')->getJson("/api/v1/owner/subscriptions/{$sub['id']}")
            ->assertOk()
            ->assertJsonPath('data.planVersionNumber', 1)
            ->assertJsonPath('data.entitlementSnapshot.price', 10000);

        // Clone plan creates draft copy; deleting referenced plan is refused.
        $this->as('owner@test.dev')->postJson("/api/v1/owner/plans/{$planId}/clone", ['code' => 'PRO_COPY', 'name' => 'Pro Copy'])
            ->assertCreated()->assertJsonPath('data.status', 'draft');

        $this->as('owner@test.dev')->deleteJson("/api/v1/owner/plans/{$planId}")->assertUnprocessable();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/plans/{$planId}/archive")->assertOk()->assertJsonPath('data.status', 'archived');
    }

    public function test_subscription_lifecycle_and_dashboard_commercial_kpis(): void
    {
        $starter = $this->as('owner@test.dev')->postJson('/api/v1/owner/plans', [
            'code' => 'SUB_BASIC', 'name' => 'Basic', 'status' => 'active', 'billingCycle' => 'monthly',
            'price' => 6000, 'currency' => 'INR', 'aiCreditAllocation' => 500,
        ])->json('data');

        $yearly = $this->as('owner@test.dev')->postJson('/api/v1/owner/plans', [
            'code' => 'SUB_ENT', 'name' => 'Enterprise Yearly', 'status' => 'active', 'billingCycle' => 'yearly',
            'price' => 120000, 'currency' => 'INR', 'aiCreditAllocation' => 3000,
        ])->json('data');

        $instId = Institution::defaultId();

        // Assign active basic plan -> allocates 500 credits and issues invoice.
        $sub = $this->as('owner@test.dev')->postJson('/api/v1/owner/subscriptions', [
            'institutionId' => $instId, 'planId' => $starter['id'], 'status' => 'active', 'generateInvoice' => true,
        ])->assertCreated()->json('data');

        $this->assertSame(500.0, AiCreditWallet::query()->where('institution_id', $instId)->value('balance'));

        // Upgrade to yearly Enterprise (MRR = 120000/12 = 10000), top-up delta credits (+2500).
        $this->as('owner@test.dev')->postJson("/api/v1/owner/subscriptions/{$sub['id']}/change-plan", [
            'planId' => $yearly['id'], 'reason' => 'Annual upgrade', 'generateInvoice' => true,
        ])->assertOk()->assertJsonPath('data.mrr', 10000);

        $this->assertSame(3000.0, AiCreditWallet::query()->where('institution_id', $instId)->value('balance'));

        // Overview KPIs include MRR=10000, ARR=120000, creditsRemaining=3000.
        $this->as('owner@test.dev')->getJson('/api/v1/owner/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.commercial.mrr', 10000)
            ->assertJsonPath('data.commercial.arr', 120000)
            ->assertJsonPath('data.ai.creditsRemaining', 3000);

        // Pause, resume, extend, cancel lifecycle transitions.
        $this->as('owner@test.dev')->postJson("/api/v1/owner/subscriptions/{$sub['id']}/pause", ['reason' => 'Summer break'])
            ->assertOk()->assertJsonPath('data.status', 'paused');
        $this->as('owner@test.dev')->postJson("/api/v1/owner/subscriptions/{$sub['id']}/resume")
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->as('owner@test.dev')->postJson("/api/v1/owner/subscriptions/{$sub['id']}/extend", ['days' => 15, 'reason' => 'Goodwill'])
            ->assertOk();
        $this->as('owner@test.dev')->postJson("/api/v1/owner/subscriptions/{$sub['id']}/cancel", ['reason' => 'End of contract'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_invoicing_coupons_tax_idempotent_payments_and_refund_approval_workflow(): void
    {
        $instId = Institution::defaultId();

        $tax = $this->as('owner@test.dev')->postJson('/api/v1/owner/tax-profiles', [
            'code' => 'GST18', 'name' => 'GST 18%', 'taxType' => 'gst', 'ratePercent' => 18,
            'gstin' => '29AABCC1234D1Z5', 'placeOfSupply' => 'Karnataka', 'isDefault' => true,
        ])->assertCreated()->json('data');

        $this->as('owner@test.dev')->postJson('/api/v1/owner/coupons', [
            'code' => 'SAVE10', 'name' => '10% Off', 'discountType' => 'percent', 'discountValue' => 10,
        ])->assertCreated();

        // Subtotal 10000 - 10% (1000) = 9000 taxable + 18% GST (1620) = 10620 total.
        $inv = $this->as('owner@test.dev')->postJson('/api/v1/owner/invoices', [
            'institutionId' => $instId,
            'taxProfileId' => $tax['id'],
            'couponCode' => 'SAVE10',
            'currency' => 'INR',
            'items' => [['description' => 'Growth Plan', 'quantity' => 1, 'unitPrice' => 10000]],
        ])->assertCreated()
            ->assertJsonPath('data.subtotal', 10000)
            ->assertJsonPath('data.discountAmount', 1000)
            ->assertJsonPath('data.taxAmount', 1620)
            ->assertJsonPath('data.total', 10620)
            ->assertJsonPath('data.balance', 10620)
            ->json('data');

        // Idempotent webhook payment: calling twice with the same gatewayEventId only applies once.
        $webhookPayload = [
            'invoiceId' => $inv['id'],
            'gatewayEventId' => 'gw_evt_unique_999',
            'amount' => 5000,
            'gateway' => 'razorpay',
            'method' => 'upi',
            'status' => 'succeeded',
            'payload' => ['cvv' => '999', 'card_number' => '4111', 'utr' => 'UTR123'],
        ];

        $payment = $this->as('owner@test.dev')->postJson('/api/v1/owner/payments/webhook', $webhookPayload)
            ->assertCreated()->assertJsonPath('duplicate', false)->json('data');

        $this->as('owner@test.dev')->postJson('/api/v1/owner/payments/webhook', $webhookPayload)
            ->assertOk()->assertJsonPath('duplicate', true);

        $this->as('owner@test.dev')->getJson("/api/v1/owner/invoices/{$inv['id']}")
            ->assertOk()
            ->assertJsonPath('data.status', 'partially_paid')
            ->assertJsonPath('data.paidAmount', 5000)
            ->assertJsonPath('data.balance', 5620);

        // Refund workflow: request -> approve -> execute, and verify over-refund is blocked.
        $this->as('owner@test.dev')->postJson('/api/v1/owner/refunds', [
            'paymentId' => $payment['id'], 'amount' => 6000, 'reason' => 'Too high',
        ])->assertUnprocessable();

        $refund = $this->as('finance@test.dev')->postJson('/api/v1/owner/refunds', [
            'paymentId' => $payment['id'], 'amount' => 2000, 'reason' => 'Prorated credit',
        ])->assertCreated()->json('data');

        $this->as('finance@test.dev')->postJson("/api/v1/owner/refunds/{$refund['id']}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');
        $this->as('finance@test.dev')->postJson("/api/v1/owner/refunds/{$refund['id']}/execute")
            ->assertOk()->assertJsonPath('data.status', 'executed');

        $this->as('owner@test.dev')->getJson('/api/v1/owner/revenue/summary')
            ->assertOk()
            ->assertJsonPath('data.invoiced', 10620)
            ->assertJsonPath('data.refunded', 2000)
            ->assertJsonPath('data.collected', 3000)
            ->assertJsonPath('data.outstanding', 7620);

        // Downloadable invoice HTML document returns 200 and omits raw card secrets.
        $this->as('owner@test.dev')->get("/api/v1/owner/invoices/{$inv['id']}/download")->assertOk();
    }

    public function test_ai_credit_ledger_reconciles_and_failed_ai_requests_are_not_charged_by_default(): void
    {
        $instId = Institution::defaultId();

        // Seed manual bonus credits + rate card; require reason on adjustments.
        $this->as('owner@test.dev')->postJson('/api/v1/owner/ai/credits/adjustments', [
            'institutionId' => $instId, 'transactionType' => 'bonus', 'creditsDelta' => 100, 'reason' => '',
        ])->assertUnprocessable();

        $this->as('owner@test.dev')->postJson('/api/v1/owner/ai/credits/adjustments', [
            'institutionId' => $instId, 'transactionType' => 'bonus', 'creditsDelta' => 100, 'reason' => 'Onboarding grant',
        ])->assertCreated()->assertJsonPath('data.wallet.balance', 100);

        $this->as('owner@test.dev')->postJson('/api/v1/owner/ai/rate-cards', [
            'serviceKey' => 'interview_turn', 'provider' => 'anthropic', 'model' => 'claude-opus-5-5',
            'creditsPerRequest' => 4, 'creditsPer1kTokens' => 0, 'chargeOnFailure' => false,
        ])->assertCreated();

        // Provider secret must remain masked on /ai/providers.
        config(['ai.providers.anthropic.key' => 'sk-ant-secret-xyz9876', 'ai.chain' => ['anthropic:claude-opus-5-5']]);
        $providersRes = $this->as('owner@test.dev')->getJson('/api/v1/owner/ai/providers')->assertOk()->json('data.providers');
        $this->assertStringNotContainsString('sk-ant-secret-xyz9876', json_encode($providersRes));

        // Failed call does NOT debit wallet; successful call debits 4 credits cleanly.
        Http::fakeSequence('https://api.anthropic.com/v1/messages')
            ->push(['error' => ['message' => 'Overloaded']], 529)
            ->push([
                'model' => 'claude-opus-5-5', 'stop_reason' => 'end_turn',
                'usage' => ['input_tokens' => 200, 'output_tokens' => 100],
                'content' => [['type' => 'text', 'text' => '{"ok":true}']],
            ]);

        $user = User::query()->where('institution_id', $instId)->firstOrFail();
        $req = new AiRequest('interview_turn', 'sys', 'usr', JsonSchema::object(['ok' => ['type' => 'boolean']]), userId: $user->id, subject: $user);

        app(AiClient::class)->json($req); // failed (529) -> 0 charged
        app(AiClient::class)->json($req); // succeeded -> 4 charged

        $wallet = AiCreditWallet::query()->where('institution_id', $instId)->firstOrFail();
        $ledgerSum = (float) AiCreditTransaction::query()->where('wallet_id', $wallet->id)->sum('credits_delta');

        $this->assertSame(96.0, $wallet->balance);
        $this->assertSame($wallet->balance, round($ledgerSum, 2));
        $this->assertTrue(AuditLog::query()->withoutGlobalScopes()->where('action', 'owner.ai_credit_adjusted')->exists());
    }

    private function platformUser(string $email, UserRole $role, ?string $roleSlug): User
    {
        $roleId = $roleSlug ? PlatformRole::query()->where('slug', $roleSlug)->value('id') : null;
        $user = new User(['name' => $email, 'email' => $email, 'password' => 'secret123', 'role' => $role->value]);
        $user->platform_role_id = $roleId;
        $user->email_verified_at = now();
        $user->save();

        return $user;
    }

    private function as(string $email): static
    {
        $user = User::query()->withoutGlobalScopes()->where('email', $email)->firstOrFail();
        $token = $user->createToken('test')->plainTextToken;
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }
}

