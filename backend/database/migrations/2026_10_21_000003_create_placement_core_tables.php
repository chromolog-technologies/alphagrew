<?php

use App\Support\Placement\LegacyCompanyImporter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Student Journey spec, steps 12-13: placement drives, job postings, eligibility rules,
 * job applications and their history. Each existing company row becomes one drive with
 * one job posting; company_applications become job applications. The legacy companies /
 * company_applications endpoints keep working until the frontend moves over.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_drives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('title');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('status', 20)->default('draft'); // draft, published, closed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['institution_id', 'status']);
        });

        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('drive_id')->constrained('placement_drives')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('employment_type', 20)->default('full_time'); // full_time, internship, ppo
            $table->string('location')->nullable();
            $table->unsignedBigInteger('ctc_min_paise')->nullable();
            $table->unsignedBigInteger('ctc_max_paise')->nullable();
            $table->unsignedBigInteger('stipend_paise')->nullable();
            $table->string('package_display')->nullable(); // free text from legacy companies ("4.2 LPA")
            $table->unsignedSmallInteger('openings')->nullable();
            $table->json('required_skills')->nullable(); // [{ skillId, minLevel, weight }]
            $table->dateTime('apply_deadline')->nullable();
            $table->string('status', 20)->default('draft'); // draft, open, closed
            $table->foreignId('legacy_company_id')->nullable()->unique()->constrained('companies')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['institution_id', 'status', 'apply_deadline']);
        });

        Schema::create('eligibility_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('job_posting_id')->constrained('job_postings')->cascadeOnDelete();
            $table->string('field', 40);
            $table->string('operator', 10); // gte, lte, eq, in, not_in
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('job_posting_id')->constrained('job_postings')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->unsignedBigInteger('resume_id')->nullable(); // FK once resumes exist (step 4)
            $table->string('status', 20)->default('applied');
            $table->json('eligibility_snapshot')->nullable();
            $table->timestamp('applied_at');
            $table->timestamp('withdrawn_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->unique(['job_posting_id', 'student_id']);
            $table->index(['student_id', 'status']);
        });

        Schema::create('job_application_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('job_application_id')->constrained('job_applications')->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete(); // null = system
            $table->string('note')->nullable();
            $table->timestamp('created_at');
        });

        (new LegacyCompanyImporter())->import();
    }

    public function down(): void
    {
        Schema::dropIfExists('job_application_events');
        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('eligibility_rules');
        Schema::dropIfExists('job_postings');
        Schema::dropIfExists('placement_drives');
    }
};
