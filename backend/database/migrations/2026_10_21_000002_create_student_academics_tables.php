<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Student Journey spec, step 3:
 * - student_academics: prior education entered by the student, verified by staff.
 * - student_academic_summaries: CGPA, backlogs and attendance derived from published
 *   results. Existing hand-entered students.cgpa / attendance are kept as the starting
 *   point (source = manual) until results are published.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_academics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('level', 20); // class_10, class_12, diploma, ug, pg
            $table->string('board_or_university');
            $table->string('institution_name');
            $table->unsignedSmallInteger('year_of_passing');
            $table->string('score_type', 20); // percentage, cgpa
            $table->decimal('score', 5, 2);
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_remarks')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'level']);
        });

        Schema::create('student_academic_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->unique()->constrained('students')->cascadeOnDelete();
            $table->decimal('cgpa', 4, 2)->nullable();
            $table->unsignedSmallInteger('active_backlogs')->default(0);
            $table->unsignedSmallInteger('backlog_history')->default(0);
            $table->decimal('attendance_percentage', 5, 2)->nullable();
            $table->unsignedSmallInteger('subjects_published')->default(0);
            $table->string('source', 20)->default('manual'); // manual (hand-entered) or results (derived)
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();
        });

        $now = now();

        foreach (DB::table('students')->whereNull('deleted_at')->orderBy('id')->get(['id', 'institution_id', 'cgpa', 'attendance']) as $student) {
            DB::table('student_academic_summaries')->insert([
                'institution_id' => $student->institution_id,
                'student_id' => $student->id,
                'cgpa' => $student->cgpa,
                'attendance_percentage' => $student->attendance,
                'source' => 'manual',
                'calculated_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_academic_summaries');
        Schema::dropIfExists('student_academics');
    }
};
