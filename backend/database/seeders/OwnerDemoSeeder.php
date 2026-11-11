<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\LoginHistory;
use App\Models\PlatformRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Owner console demo data (password demo123): owner@demo.com (Super Admin), one platform staff
 * member per built-in platform role, the default institution's profile, a second institution
 * on a trial that ends soon and a third waiting for verification, and some sign-in history.
 */
class OwnerDemoSeeder extends Seeder
{
    private const STAFF = [
        'platform@demo.com' => ['Priya Raman', 'platform-manager'],
        'finance@demo.com' => ['Karan Mehta', 'finance-manager'],
        'support@demo.com' => ['Anita George', 'support-manager'],
        'tech@demo.com' => ['Rohan Das', 'technical-admin'],
        'auditor@demo.com' => ['Fatima Sheikh', 'security-auditor'],
        'sales@demo.com' => ['Vivek Iyer', 'customer-success'],
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $owner = $this->platformUser('owner@demo.com', 'Chromolog Owner', UserRole::SuperAdmin, null);

            foreach (self::STAFF as $email => [$name, $role]) {
                $this->platformUser($email, $name, UserRole::PlatformStaff, PlatformRole::query()->where('slug', $role)->value('id'));
            }

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
        });
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
