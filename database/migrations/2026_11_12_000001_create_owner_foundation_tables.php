<?php

use App\Support\Owner\OwnerPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Owner Dashboard R1 (SRS v1.0): platform roles for platform staff, MFA and last-login on
 * users, the institution profile and lifecycle, status history, login history and global
 * platform settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->string('slug', 120)->unique();
            $table->string('description', 255)->nullable();
            $table->json('permissions');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('platform_role_id')->nullable()->constrained('platform_roles')->nullOnDelete();
            $table->text('mfa_secret')->nullable();
            $table->timestamp('mfa_enabled_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
        });

        Schema::table('institutions', function (Blueprint $table) {
            $table->string('institution_type', 30)->default('college');
            $table->string('registration_number', 100)->nullable();
            $table->string('official_email')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('website')->nullable();
            $table->string('country', 80)->nullable();
            $table->string('state', 80)->nullable();
            $table->string('district', 80)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('pincode', 12)->nullable();
            $table->string('verification_status', 30)->default('pending');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason', 500)->nullable();
            $table->index(['status', 'created_at']);
        });

        // Existing institutions were set up by hand: verified, and either active or suspended.
        DB::table('institutions')->update(['verification_status' => 'verified']);
        DB::table('institutions')->where('status', '!=', 'active')->update(['status' => 'suspended']);

        Schema::create('institution_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20); // lifecycle | verification
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->string('reason', 500)->nullable();
            $table->timestamp('effective_at');
            $table->boolean('applied')->default(true); // false while a scheduled change waits
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index(['institution_id', 'created_at']);
            $table->index(['applied', 'effective_at']);
        });

        Schema::create('login_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email');
            $table->string('outcome', 20); // success | failed | locked | refused | mfa_failed
            $table->string('reason', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['outcome', 'created_at']);
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $now = now();
        foreach (OwnerPermission::systemRoles() as $role) {
            DB::table('platform_roles')->insert([
                ...$role,
                'permissions' => json_encode($role['permissions']),
                'is_system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('login_histories');
        Schema::dropIfExists('institution_status_events');

        Schema::table('institutions', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropColumn([
                'institution_type', 'registration_number', 'official_email', 'contact_phone', 'website', 'country', 'state',
                'district', 'address', 'pincode', 'verification_status', 'trial_ends_at', 'suspended_at', 'suspension_reason',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('platform_role_id');
            $table->dropColumn(['mfa_secret', 'mfa_enabled_at', 'last_login_at']);
        });

        Schema::dropIfExists('platform_roles');
    }
};
