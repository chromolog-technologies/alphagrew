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
        Schema::table('courses', function (Blueprint $table) {
            // Add new fields if they don't exist
            if (!Schema::hasColumn('courses', 'duration_years')) {
                $table->integer('duration_years')->nullable()->after('department_id');
            }
            if (!Schema::hasColumn('courses', 'total_semesters')) {
                $table->integer('total_semesters')->nullable()->after('duration_years');
            }
            if (!Schema::hasColumn('courses', 'stream')) {
                $table->string('stream')->nullable()->after('total_semesters');
            }
            if (!Schema::hasColumn('courses', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('stream');
            }
        });

        Schema::table('subjects', function (Blueprint $table) {
            // Add new fields if they don't exist
            if (!Schema::hasColumn('subjects', 'semester_number')) {
                $table->integer('semester_number')->nullable()->after('course_id');
            }
            if (!Schema::hasColumn('subjects', 'credit_hours')) {
                $table->integer('credit_hours')->default(4)->after('semester_number');
            }
            if (!Schema::hasColumn('subjects', 'lecture_hours')) {
                $table->integer('lecture_hours')->default(0)->after('credit_hours');
            }
            if (!Schema::hasColumn('subjects', 'practical_hours')) {
                $table->integer('practical_hours')->default(0)->after('lecture_hours');
            }
            if (!Schema::hasColumn('subjects', 'subject_type')) {
                $table->string('subject_type')->nullable()->after('practical_hours');
            }
            if (!Schema::hasColumn('subjects', 'is_mandatory')) {
                $table->boolean('is_mandatory')->default(true)->after('subject_type');
            }
            if (!Schema::hasColumn('subjects', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_mandatory');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'duration_years',
                'total_semesters',
                'stream',
                'is_active',
            ]);
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn([
                'semester_number',
                'credit_hours',
                'lecture_hours',
                'practical_hours',
                'subject_type',
                'is_mandatory',
                'is_active',
            ]);
        });
    }
};
