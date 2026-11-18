<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Mark Scheme Table - Defines internal/external/pass marks per subject
        if (!Schema::hasTable('mark_schemes')) {
            Schema::create('mark_schemes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->integer('internal_marks')->default(40); // e.g., 40
                $table->integer('external_marks')->default(60); // e.g., 60
                $table->integer('total_marks')->default(100); // internal + external
                $table->integer('pass_mark')->default(40); // minimum to pass
                $table->integer('extra_marks_allowed')->default(0); // bonus marks
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['subject_id', 'semester_id']);
                $table->index('is_active');
            });
        }

        // Grade Rules Table - Defines grade boundaries
        if (!Schema::hasTable('grade_rules')) {
            Schema::create('grade_rules', function (Blueprint $table) {
                $table->id();
                $table->integer('min_score'); // e.g., 90
                $table->integer('max_score'); // e.g., 100
                $table->string('grade', 3); // e.g., "A+"
                $table->decimal('gpa', 3, 2)->default(4.0); // e.g., 4.0
                $table->text('description')->nullable();
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['min_score', 'max_score']);
                $table->index('grade');
            });
        }

        // Mark Entry Table - Stores actual marks entered by teacher
        if (!Schema::hasTable('mark_entries')) {
            Schema::create('mark_entries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('exam_id')->constrained('exams')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('mark_scheme_id')->constrained('mark_schemes')->onDelete('cascade');
                $table->decimal('internal_marks', 5, 2)->nullable();
                $table->decimal('external_marks', 5, 2)->nullable();
                $table->decimal('extra_marks', 5, 2)->default(0); // bonus
                $table->boolean('is_absent')->default(false);
                $table->decimal('total_marks', 5, 2)->nullable(); // calculated
                $table->string('grade', 3)->nullable(); // calculated (A+, A, B, etc)
                $table->string('result', 20)->default('pending'); // PASS, FAIL, PENDING
                $table->enum('status', ['draft', 'submitted', 'verified', 'approved', 'published', 'locked'])->default('draft');
                $table->text('remarks')->nullable();
                $table->foreignId('entered_by')->nullable()->constrained('users')->onDelete('set null'); // teacher
                $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null'); // HOD
                $table->timestamp('verified_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['exam_id', 'student_id', 'subject_id']);
                $table->index('status');
                $table->index('result');
                $table->index('is_absent');
            });
        }

        // Semester Result Table - Overall result per student per semester
        if (!Schema::hasTable('semester_results')) {
            Schema::create('semester_results', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->integer('total_subjects')->default(0);
                $table->integer('subjects_passed')->default(0);
                $table->integer('subjects_failed')->default(0);
                $table->decimal('total_marks', 8, 2)->default(0);
                $table->decimal('total_possible_marks', 8, 2)->default(0);
                $table->decimal('percentage', 5, 2)->default(0);
                $table->string('overall_grade', 3)->nullable(); // A+, A, B, etc
                $table->decimal('gpa', 3, 2)->default(0);
                $table->string('result', 20)->default('pending'); // PASS, FAIL, PENDING, WITHHELD
                $table->boolean('is_published')->default(false);
                $table->timestamp('published_at')->nullable();
                $table->timestamp('locked_at')->nullable();
                $table->foreignId('published_by')->nullable()->constrained('users')->onDelete('set null');
                $table->text('remarks')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['student_id', 'semester_id']);
                $table->index('is_published');
                $table->index('result');
            });
        }

        // Result Publishing Log - Audit trail
        if (!Schema::hasTable('result_publishing_logs')) {
            Schema::create('result_publishing_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->foreignId('published_by')->constrained('users')->onDelete('cascade');
                $table->integer('total_students')->default(0);
                $table->integer('students_published')->default(0);
                $table->enum('action', ['draft', 'verify', 'approve', 'publish', 'unlock', 'revert'])->default('publish');
                $table->text('details')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();

                $table->index('semester_id');
                $table->index('published_by');
                $table->index('published_at');
            });
        }

        // Revaluation Request Table (Optional feature)
        if (!Schema::hasTable('revaluation_requests')) {
            Schema::create('revaluation_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('mark_entry_id')->constrained('mark_entries')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->text('reason');
                $table->enum('status', ['requested', 'under_review', 'completed', 'rejected'])->default('requested');
                $table->decimal('updated_marks', 5, 2)->nullable();
                $table->text('revaluation_remarks')->nullable();
                $table->foreignId('revalued_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('student_id');
                $table->index('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('revaluation_requests');
        Schema::dropIfExists('result_publishing_logs');
        Schema::dropIfExists('semester_results');
        Schema::dropIfExists('mark_entries');
        Schema::dropIfExists('grade_rules');
        Schema::dropIfExists('mark_schemes');
    }
};
