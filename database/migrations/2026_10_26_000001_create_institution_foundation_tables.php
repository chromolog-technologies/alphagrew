<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Slice 2 (institution foundation, PRD §5–6): batches (an admission cohort of a
 * department or course), campuses, and the institution's placement policy.
 * Branding and contact settings live in institutions.settings (JSON).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->string('department_code', 20)->nullable();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->unsignedSmallInteger('admission_year');
            $table->unsignedSmallInteger('graduation_year');
            // active | graduated | archived
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['institution_id', 'code']);
            $table->index(['institution_id', 'status']);
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->foreignId('batch_id')->nullable()->after('department_code')->constrained('batches')->nullOnDelete();
        });

        Schema::table('classes', function (Blueprint $table): void {
            $table->foreignId('batch_id')->nullable()->after('batch')->constrained('batches')->nullOnDelete();
        });

        Schema::create('campuses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 30);
            $table->string('address', 500)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['institution_id', 'code']);
        });

        Schema::create('placement_policies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->unique()->constrained('institutions')->restrictOnDelete();
            // A student who accepted an offer can't apply to other drives…
            $table->boolean('one_offer_rule')->default(true);
            // …except a "dream" job at or above this CTC (lakhs per annum).
            $table->boolean('dream_offer_enabled')->default(false);
            $table->decimal('dream_offer_min_ctc', 6, 2)->nullable();
            $table->unsignedSmallInteger('offer_response_days')->default(7);
            $table->unsignedSmallInteger('max_active_applications')->nullable();
            $table->unsignedTinyInteger('min_profile_completion')->default(0);
            $table->boolean('debar_on_renege')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_policies');
        Schema::dropIfExists('campuses');

        Schema::table('classes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('batch_id');
        });
        Schema::table('students', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('batch_id');
        });

        Schema::dropIfExists('batches');
    }
};
