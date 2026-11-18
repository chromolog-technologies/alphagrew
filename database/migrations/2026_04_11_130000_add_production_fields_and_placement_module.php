<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update personal_access_tokens to set default 30-day expiry
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (!Schema::hasColumn('personal_access_tokens', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('last_used_at');
            }
        });

        // Set expiry for existing tokens without one (30 days from creation)
        $expiresAt = match (DB::getDriverName()) {
            'sqlite' => "datetime(created_at, '+30 days')",
            'pgsql' => "created_at + interval '30 days'",
            default => 'DATE_ADD(created_at, INTERVAL 30 DAY)',
        };

        DB::table('personal_access_tokens')
            ->whereNull('expires_at')
            ->update([
                'expires_at' => DB::raw($expiresAt)
            ]);

        // 2. Add Production Fields to Companies
        Schema::table('companies', function (Blueprint $table) {
            if (!Schema::hasColumn('companies', 'deleted_at')) {
                $table->softDeletes();
            }
            if (!Schema::hasColumn('companies', 'logo_url')) {
                $table->string('logo_url')->nullable();
            }
            if (!Schema::hasColumn('companies', 'website')) {
                $table->string('website')->nullable();
            }
            if (!Schema::hasColumn('companies', 'industry')) {
                $table->string('industry')->nullable();
            }
        });

        // 3. Add Intelligence Fields to Students
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'placement_score')) {
                $table->decimal('placement_score', 3, 2)->nullable()->after('cgpa');
            }
            if (!Schema::hasColumn('students', 'risk_level')) {
                $table->enum('risk_level', ['low', 'medium', 'high'])->default('medium')->after('placement_score');
            }
        });

        // 4. Create Placement Rounds Table
        if (!Schema::hasTable('placement_rounds')) {
            Schema::create('placement_rounds', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
                $table->string('name'); // Aptitude Round, Technical Interview, HR Round
                $table->enum('type', ['aptitude', 'technical', 'hr', 'group_discussion', 'other'])->default('technical');
                $table->dateTime('scheduled_at')->nullable();
                $table->integer('duration_minutes')->nullable();
                $table->text('description')->nullable();
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('company_id');
                $table->index('scheduled_at');
            });
        }

        // 5. Create Placement Results Table
        if (!Schema::hasTable('placement_results')) {
            Schema::create('placement_results', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
                $table->foreignId('round_id')->nullable()->constrained('placement_rounds')->onDelete('set null');
                $table->enum('status', ['pending', 'cleared', 'rejected', 'waitlist'])->default('pending');
                $table->decimal('score', 5, 2)->nullable();
                $table->text('feedback')->nullable();
                $table->timestamps();
                
                $table->unique(['student_id', 'company_id', 'round_id']);
                $table->index(['company_id', 'status']);
                $table->index('student_id');
            });
        }

        // 6. Create Dashboard Stats Table (Precomputed)
        if (!Schema::hasTable('dashboard_stats')) {
            Schema::create('dashboard_stats', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique(); // e.g., 'placement_rate', 'avg_package'
                $table->json('value');
                $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade');
                $table->timestamp('computed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['expires_at']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['deleted_at', 'logo_url', 'website', 'industry']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['placement_score', 'risk_level']);
        });

        Schema::dropIfExists('placement_rounds');
        Schema::dropIfExists('placement_results');
        Schema::dropIfExists('dashboard_stats');
    }
};
