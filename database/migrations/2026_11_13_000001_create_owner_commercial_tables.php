<?php

use App\Support\Owner\OwnerPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Owner Dashboard R2 (SRS v1.0 §5.6-5.9): subscription plans & immutable versions,
 * institution subscriptions & events, tax profiles, coupons, invoices & line items,
 * idempotent payment & refund workflows, AI credit wallets, append-only ledger & rate cards.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('name', 120);
                $table->string('description', 500)->nullable();
                $table->string('status', 20)->default('draft'); // draft | active | archived
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_public')->default(true);
                $table->timestamps();
                $table->index(['status', 'sort_order'], 'plans_status_sort_idx');
            });
        }

        if (! Schema::hasTable('plan_versions')) {
            Schema::create('plan_versions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
                $table->unsignedInteger('version_number');
                $table->string('billing_cycle', 20)->default('monthly'); // monthly | quarterly | yearly
                $table->decimal('price', 12, 2);
                $table->decimal('setup_fee', 12, 2)->default(0);
                $table->string('currency', 3)->default('INR');
                $table->unsignedInteger('trial_days')->default(14);
                $table->unsignedInteger('student_limit')->nullable();
                $table->unsignedInteger('faculty_limit')->nullable();
                $table->unsignedInteger('campus_limit')->nullable();
                $table->unsignedInteger('department_limit')->nullable();
                $table->unsignedInteger('recruiter_limit')->nullable();
                $table->unsignedInteger('storage_limit_mb')->default(5120);
                $table->unsignedInteger('api_requests_limit')->nullable();
                $table->decimal('ai_credit_allocation', 12, 2)->default(0);
                $table->string('ai_credit_reset_period', 20)->default('monthly'); // monthly | quarterly | yearly | none
                $table->json('features');
                $table->boolean('is_current')->default(true);
                $table->timestamp('published_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->unique(['plan_id', 'version_number'], 'plan_versions_unique');
                $table->index(['plan_id', 'is_current'], 'plan_versions_current_idx');
            });
        }

        if (! Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
                $table->foreignId('plan_id')->constrained('plans')->restrictOnDelete();
                $table->foreignId('plan_version_id')->constrained('plan_versions')->restrictOnDelete();
                $table->string('status', 20)->default('trial'); // trial | active | past_due | paused | cancelled | expired
                $table->string('billing_cycle', 20)->default('monthly');
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3)->default('INR');
                $table->dateTime('start_at');
                $table->dateTime('end_at');
                $table->timestamp('trial_start_at')->nullable();
                $table->timestamp('trial_end_at')->nullable();
                $table->timestamp('renewal_at')->nullable();
                $table->timestamp('grace_ends_at')->nullable();
                $table->unsignedInteger('grace_days')->default(7);
                $table->string('expiry_behavior', 30)->default('grace_then_readonly'); // grace_then_readonly | grace_then_suspend | immediate_suspend
                $table->boolean('auto_renew')->default(true);
                $table->json('entitlement_snapshot');
                $table->string('cancel_reason', 500)->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('paused_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['institution_id', 'status', 'end_at'], 'subscriptions_inst_status_idx');
                $table->index(['renewal_at'], 'subscriptions_renewal_idx');
            });
        }

        Schema::create('subscription_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->string('event_type', 40);
            $table->foreignId('from_plan_version_id')->nullable()->constrained('plan_versions')->nullOnDelete();
            $table->foreignId('to_plan_version_id')->nullable()->constrained('plan_versions')->nullOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20)->nullable();
            $table->string('reason', 500)->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index(['subscription_id', 'created_at'], 'sub_events_sub_created_idx');
        });

        Schema::create('tax_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 120);
            $table->string('tax_type', 20)->default('gst'); // gst | vat | sales_tax | none
            $table->decimal('rate_percent', 5, 2)->default(18.00);
            $table->string('gstin', 30)->nullable();
            $table->string('place_of_supply', 120)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 120);
            $table->string('discount_type', 20)->default('percent'); // percent | fixed
            $table->decimal('discount_value', 12, 2);
            $table->string('currency', 3)->nullable();
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedInteger('redemptions_count')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 60)->unique();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->foreignId('tax_profile_id')->nullable()->constrained('tax_profiles')->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->string('status', 20)->default('draft'); // draft | issued | partially_paid | paid | overdue | void
            $table->string('currency', 3)->default('INR');
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->timestamp('issued_at')->nullable();
            $table->date('due_at');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_rate_percent', 5, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('balance', 12, 2);
            $table->string('gstin', 30)->nullable();
            $table->string('place_of_supply', 120)->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['institution_id', 'status', 'due_at'], 'invoices_inst_status_due_idx');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('description', 255);
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount', 12, 2);
            $table->string('item_type', 30)->default('subscription'); // subscription | setup_fee | ai_credits | addon | adjustment
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->string('payment_reference', 120)->unique()->nullable();
            $table->string('gateway', 50)->default('manual');
            $table->string('method', 50)->default('bank_transfer');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('INR');
            $table->string('status', 25)->default('succeeded'); // pending | succeeded | failed | refunded | partially_refunded
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->string('gateway_event_id', 120)->unique()->nullable();
            $table->json('gateway_payload_reference')->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['institution_id', 'status'], 'payments_inst_status_idx');
        });

        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->string('event_id', 120)->unique();
            $table->string('gateway', 50);
            $table->string('event_type', 80);
            $table->string('status', 30)->default('processed'); // processed | ignored_duplicate | failed
            $table->json('payload')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('INR');
            $table->string('reason', 500);
            $table->string('status', 20)->default('requested'); // requested | approved | rejected | executed
            $table->string('gateway_refund_reference', 120)->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('executed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at'], 'refunds_status_created_idx');
        });

        Schema::create('ai_credit_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete()->unique();
            $table->decimal('balance', 14, 2)->default(0);
            $table->decimal('allocated_total', 14, 2)->default(0);
            $table->decimal('consumed_total', 14, 2)->default(0);
            $table->decimal('monthly_quota', 14, 2)->nullable();
            $table->unsignedTinyInteger('warning_threshold_percent')->default(80);
            $table->boolean('hard_stop_on_exhaustion')->default(false);
            $table->boolean('charge_failed_requests')->default(false);
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('ai_credit_wallets')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->string('transaction_type', 30); // plan_allocation | bonus | purchased | usage_debit | manual_adjustment | reversal | expiry
            $table->decimal('credits_delta', 14, 2);
            $table->decimal('balance_after', 14, 2);
            $table->string('source_type', 60)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('idempotency_key', 120)->unique()->nullable();
            $table->string('reason', 500)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index(['wallet_id', 'created_at'], 'ai_tx_wallet_created_idx');
            $table->index(['institution_id', 'created_at'], 'ai_tx_inst_created_idx');
        });

        Schema::create('ai_rate_cards', function (Blueprint $table) {
            $table->id();
            $table->string('service_key', 60);
            $table->string('provider', 60);
            $table->string('model', 100);
            $table->decimal('credits_per_request', 10, 2)->default(1.00);
            $table->decimal('credits_per_1k_tokens', 10, 4)->default(0);
            $table->decimal('usd_per_1k_input_tokens', 10, 6)->default(0);
            $table->decimal('usd_per_1k_output_tokens', 10, 6)->default(0);
            $table->unsignedInteger('rate_limit_per_minute')->nullable();
            $table->unsignedTinyInteger('warning_threshold_percent')->default(80);
            $table->boolean('charge_on_failure')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['service_key', 'provider', 'model'], 'ai_rate_cards_unique');
        });

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            $table->decimal('credits_charged', 10, 2)->nullable()->after('estimated_cost_usd');
            $table->unsignedBigInteger('rate_card_id')->nullable()->after('credits_charged')->index();
        });

        $now = now();
        foreach (OwnerPermission::systemRoles() as $role) {
            DB::table('platform_roles')
                ->where('slug', $role['slug'])
                ->update([
                    'description' => $role['description'],
                    'permissions' => json_encode($role['permissions']),
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('ai_usage_logs', function (Blueprint $table) {
            $table->dropIndex(['rate_card_id']);
            $table->dropColumn(['credits_charged', 'rate_card_id']);
        });

        foreach ([
            'ai_rate_cards',
            'ai_credit_transactions',
            'ai_credit_wallets',
            'refunds',
            'payment_events',
            'payments',
            'invoice_items',
            'invoices',
            'coupons',
            'tax_profiles',
            'subscription_events',
            'subscriptions',
            'plan_versions',
            'plans',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};

