<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Slice 1 (auth hardening & onboarding, PRD §6 "Onboarding and invitations", §13):
 * account status and lockout on users, invitations, and an append-only audit log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // active | pending_approval | rejected | suspended (App\Enums\UserStatus)
            $table->string('status', 30)->default('active')->after('role')->index();
            $table->string('status_reason', 500)->nullable()->after('status');
            $table->unsignedSmallInteger('failed_login_attempts')->default(0)->after('remember_token');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
        });

        // Every existing account was meant to be verified, but email_verified_at was not mass
        // assignable, so accounts created through the app were saved without it. Applying to
        // drives now requires a verified address, so mark the existing accounts verified.
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)')]);

        Schema::create('invitations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->string('email');
            $table->string('role', 30);
            $table->string('department_code', 20)->nullable();
            $table->foreignId('designation_id')->nullable()->constrained('designations')->nullOnDelete();
            // SHA-256 of the token sent by email; the token itself is never stored.
            $table->string('token_hash', 64)->unique();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['institution_id', 'email']);
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            // Null for platform-level events (super admin, unknown account).
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['institution_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('invitations');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'status_reason', 'failed_login_attempts', 'locked_until']);
        });
    }
};
