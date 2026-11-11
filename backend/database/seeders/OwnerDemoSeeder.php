<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\AiRateCard;
use App\Models\Coupon;
use App\Models\Institution;
use App\Models\LoginHistory;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\TaxProfile;
use App\Models\User;
use App\Services\Owner\BillingService;
use App\Services\Owner\PlanService;
use App\Services\Owner\SubscriptionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Owner console demo data (password demo123): owner@demo.com (Platform Owner / Super Admin),
 * the default institution's profile, a second institution on a trial that ends soon and a
 * third waiting for verification, and sample sign-in history.
 */
class OwnerDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $owner = $this->platformUser('owner@demo.com', 'Chromolog Owner', UserRole::SuperAdmin, null);

            Institution::query()->where('code', Institution::DEFAULT_CODE)->update([
                'name' => 'Brightnode Institute of Technology',
                'institution_type' => 'college', 'official_email' => 'office@brightnode.edu', 'contact_phone' => '+91 44 2345 6789',
                'website' => 'https://brightnode.example.edu', 'country' => 'India', 'state' => 'Tamil Nadu', 'district' => 'Chennai',
                'address' => '12 Anna Salai, Chennai', 'pincode' => '600002', 'verification_status' => 'verified', 'registration_number' => 'AICTE-1-0042',
            ]);

            $trial = Institution::query()->updateOrCreate(['code' => 'RIVERSIDE'], [
                'name' => 'Riverside Institute of Technology', 'slug' => 'riverside', 'status' => 'trial', 'institution_type' => 'institute',
                'official_email' => 'admin@riverside.example.edu', 'contact_phone' => '+91 80 4123 9876', 'country' => 'India', 'state' => 'Karnataka',
                'district' => 'Bengaluru Urban', 'address' => '4th Cross, Whitefield, Bengaluru', 'pincode' => '560066', 'verification_status' => 'verified',
                'trial_ends_at' => now()->addDays(9)->endOfDay(),
            ]);
            $trial->statusEvents()->firstOrCreate(['kind' => 'lifecycle', 'to_status' => 'trial'], [
                'from_status' => 'prospect', 'reason' => 'Pilot for the 2026-27 placement season', 'effective_at' => now()->subDays(21), 'applied' => true, 'actor_id' => $owner->id,
            ]);
            $admin = User::query()->withoutGlobalScopes()->firstOrNew(['email' => 'riverside.admin@demo.com']);
            $admin->forceFill([
                'name' => 'Meera Kulkarni', 'password' => 'demo123', 'role' => UserRole::InstitutionAdmin->value, 'title' => 'Institution Administrator',
                'institution_id' => $trial->id, 'email_verified_at' => now(), 'status' => 'active',
            ])->save();

            $pending = Institution::query()->updateOrCreate(['code' => 'NORTHFIELD'], [
                'name' => 'Northfield University', 'slug' => 'northfield', 'status' => 'prospect', 'institution_type' => 'university',
                'official_email' => 'registrar@northfield.example.edu', 'contact_phone' => '+91 11 4567 0000', 'country' => 'India', 'state' => 'Delhi',
                'district' => 'New Delhi', 'address' => 'Ring Road, New Delhi', 'pincode' => '110001', 'verification_status' => 'pending',
            ]);
            $pending->statusEvents()->firstOrCreate(['kind' => 'lifecycle', 'to_status' => 'prospect'], [
                'from_status' => null, 'reason' => 'Enquiry from the website', 'effective_at' => now()->subDays(3), 'applied' => true, 'actor_id' => $owner->id,
            ]);

            foreach ([
                ['admin@demo.com', 'success', null, 2], ['student@demo.com', 'success', null, 5], ['unknown@example.com', 'failed', 'Unknown email', 7],
                ['staff@demo.com', 'failed', 'Wrong password', 9], ['owner@demo.com', 'success', null, 30],
            ] as [$email, $outcome, $reason, $minutesAgo]) {
                $user = User::query()->withoutGlobalScopes()->where('email', $email)->first();
                LoginHistory::query()->create([
                    'user_id' => $user?->id, 'institution_id' => $user?->institution_id, 'email' => $email, 'outcome' => $outcome, 'reason' => $reason,
                    'ip_address' => '203.0.113.'.(10 + $minutesAgo), 'user_agent' => 'Mozilla/5.0 (demo)',
                ])->forceFill(['created_at' => now()->subMinutes($minutesAgo)])->save();
            }

            $this->seedCommercialData($owner, $trial);
        });
    }

    private function seedCommercialData(User $owner, Institution $trial): void
    {
        TaxProfile::query()->firstOrCreate(['code' => 'GST-18'], [
            'name' => 'India GST 18%',
            'tax_type' => 'gst',
            'rate_percent' => 18.00,
            'gstin' => '29AABCC1234D1Z5',
            'place_of_supply' => 'Karnataka',
            'is_default' => true,
            'is_active' => true,
        ]);

        Coupon::query()->firstOrCreate(['code' => 'LAUNCH20'], [
            'name' => 'Launch Partner 20% Off',
            'discount_type' => 'percent',
            'discount_value' => 20.00,
            'max_redemptions' => 100,
            'is_active' => true,
        ]);

        foreach ([
            ['resume_parse', 'anthropic', 'claude-opus-5-5', 2.00, 0.50],
            ['resume_analysis', 'anthropic', 'claude-opus-5-5', 4.00, 1.00],
            ['interview_plan', 'anthropic', 'claude-opus-5-5', 3.00, 0.75],
            ['interview_turn', 'anthropic', 'claude-opus-5-5', 1.50, 0.50],
            ['interview_turn_analysis', 'anthropic', 'claude-opus-5-5', 1.50, 0.50],
            ['interview_evaluation', 'anthropic', 'claude-opus-5-5', 5.00, 1.00],
        ] as [$serviceKey, $provider, $model, $perReq, $per1k]) {
            AiRateCard::query()->firstOrCreate(
                ['service_key' => $serviceKey, 'provider' => $provider, 'model' => $model],
                ['credits_per_request' => $perReq, 'credits_per_1k_tokens' => $per1k, 'usd_per_1k_input_tokens' => 0.004, 'usd_per_1k_output_tokens' => 0.02, 'is_active' => true]
            );
        }

        if (Plan::query()->exists()) {
            return;
        }

        $planService = app(PlanService::class);
        $subService = app(SubscriptionService::class);
        $billing = app(BillingService::class);

        $starter = $planService->create([
            'code' => 'STARTER',
            'name' => 'Campus Starter',
            'description' => 'Core academic, attendance and placement workflows for growing colleges.',
            'status' => 'active',
            'sortOrder' => 1,
            'billingCycle' => 'monthly',
            'price' => 14999,
            'setupFee' => 0,
            'currency' => 'INR',
            'trialDays' => 14,
            'studentLimit' => 1000,
            'facultyLimit' => 100,
            'campusLimit' => 1,
            'departmentLimit' => 10,
            'recruiterLimit' => 25,
            'storageLimitMb' => 10240,
            'apiRequestsLimit' => 50000,
            'aiCreditAllocation' => 2500,
            'aiCreditResetPeriod' => 'monthly',
            'features' => ['placement' => true, 'assessments' => true, 'resume_ai' => true, 'ai_interviews' => false, 'analytics' => true, 'api_access' => false, 'custom_branding' => false],
        ], $owner);

        $growth = $planService->create([
            'code' => 'GROWTH',
            'name' => 'Career Intelligence Growth',
            'description' => 'Full AI interviews, resume intelligence and custom dashboards for autonomous campuses.',
            'status' => 'active',
            'sortOrder' => 2,
            'billingCycle' => 'monthly',
            'price' => 39999,
            'setupFee' => 5000,
            'currency' => 'INR',
            'trialDays' => 30,
            'studentLimit' => 5000,
            'facultyLimit' => 400,
            'campusLimit' => 5,
            'departmentLimit' => 30,
            'recruiterLimit' => 150,
            'storageLimitMb' => 51200,
            'apiRequestsLimit' => 250000,
            'aiCreditAllocation' => 12000,
            'aiCreditResetPeriod' => 'monthly',
            'features' => ['placement' => true, 'assessments' => true, 'resume_ai' => true, 'ai_interviews' => true, 'analytics' => true, 'api_access' => true, 'custom_branding' => true],
        ], $owner);

        $planService->create([
            'code' => 'ENTERPRISE',
            'name' => 'University Enterprise',
            'description' => 'Unlimited multi-campus scale, priority inference and dedicated SLAs.',
            'status' => 'active',
            'sortOrder' => 3,
            'billingCycle' => 'yearly',
            'price' => 450000,
            'setupFee' => 25000,
            'currency' => 'INR',
            'trialDays' => 30,
            'studentLimit' => null,
            'facultyLimit' => null,
            'campusLimit' => null,
            'departmentLimit' => null,
            'recruiterLimit' => null,
            'storageLimitMb' => 256000,
            'apiRequestsLimit' => null,
            'aiCreditAllocation' => 60000,
            'aiCreditResetPeriod' => 'monthly',
            'features' => ['placement' => true, 'assessments' => true, 'resume_ai' => true, 'ai_interviews' => true, 'analytics' => true, 'api_access' => true, 'custom_branding' => true],
        ], $owner);

        $defaultInst = Institution::query()->where('code', Institution::DEFAULT_CODE)->first();
        if ($defaultInst && ! Subscription::query()->where('institution_id', $defaultInst->id)->exists()) {
            $sub = $subService->assign([
                'institutionId' => $defaultInst->id,
                'planId' => $growth->id,
                'status' => 'active',
                'generateInvoice' => true,
            ], $owner);

            $inv = $sub->invoices()->first();
            if ($inv) {
                $billing->recordPayment([
                    'invoiceId' => $inv->id,
                    'amount' => $inv->total,
                    'gateway' => 'razorpay',
                    'method' => 'upi_emandate',
                    'status' => 'succeeded',
                    'gatewayEventId' => 'evt_demo_default_paid_1',
                ], $owner);
            }
        }

        if (! Subscription::query()->where('institution_id', $trial->id)->exists()) {
            $subService->assign([
                'institutionId' => $trial->id,
                'planId' => $starter->id,
                'status' => 'trial',
                'trialDays' => 9,
                'generateInvoice' => false,
            ], $owner);
        }
    }

    private function platformUser(string $email, string $name, UserRole $role, ?int $platformRoleId): User
    {
        $user = User::query()->withoutGlobalScopes()->firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => $name, 'password' => 'demo123', 'role' => $role->value, 'title' => $role === UserRole::SuperAdmin ? 'Platform Owner' : 'Platform staff',
            'institution_id' => null, 'platform_role_id' => $platformRoleId, 'email_verified_at' => now(), 'status' => 'active',
        ])->save();

        return $user;
    }
}
