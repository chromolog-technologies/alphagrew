<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Owner Dashboard SRS v1.0 parity additions for Releases 1 & 2:
 * institution logo upload path, per-institution configuration overrides (FR-GS-004),
 * high-severity security events (FR-SEC-003), and system incidents lifecycle (FR-SYS-003).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('institutions') && ! Schema::hasColumn('institutions', 'logo_path')) {
            Schema::table('institutions', function (Blueprint $table): void {
                $table->string('logo_path', 255)->nullable()->after('website');
            });
        }

        if (! Schema::hasTable('institution_settings')) {
            Schema::create('institution_settings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
                $table->string('key', 100);
                $table->json('value')->nullable();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->unique(['institution_id', 'key']);
            });
        }

        if (! Schema::hasTable('security_events')) {
            Schema::create('security_events', function (Blueprint $table): void {
                $table->id();
                $table->string('severity', 20)->default('warning'); // info, warning, high, critical
                $table->string('event_type', 60);
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('email')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent', 255)->nullable();
                $table->string('summary', 500);
                $table->json('metadata')->nullable();
                $table->string('status', 20)->default('open'); // open, acknowledged, resolved
                $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('resolved_at')->nullable();
                $table->timestamps();
                $table->index(['status', 'severity', 'created_at']);
            });
        }

        if (! Schema::hasTable('system_incidents')) {
            Schema::create('system_incidents', function (Blueprint $table): void {
                $table->id();
                $table->string('title', 200);
                $table->string('severity', 20)->default('medium'); // low, medium, high, critical
                $table->string('status', 20)->default('open'); // open, investigating, mitigated, resolved
                $table->string('component', 80)->default('platform'); // database, queue, ai, auth, billing, storage, platform
                $table->text('summary');
                $table->string('impact', 255)->nullable();
                $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('acknowledged_at')->nullable();
                $table->dateTime('resolved_at')->nullable();
                $table->text('resolution_note')->nullable();
                $table->timestamps();
                $table->index(['status', 'severity', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_incidents');
        Schema::dropIfExists('security_events');
        Schema::dropIfExists('institution_settings');

        if (Schema::hasTable('institutions') && Schema::hasColumn('institutions', 'logo_path')) {
            Schema::table('institutions', function (Blueprint $table): void {
                $table->dropColumn('logo_path');
            });
        }
    }
};

