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
            // Add new academic structure fields
            if (!Schema::hasColumn('courses', 'course_type')) {
                $table->enum('course_type', ['UG', 'PG', 'Diploma', 'Certification'])
                    ->nullable()
                    ->after('code')
                    ->comment('Course Type: UG/PG/Diploma/Certification');
            }

            if (!Schema::hasColumn('courses', 'stream')) {
                $table->enum('stream', ['Science', 'Commerce', 'Arts', 'Engineering', 'Management', 'Other'])
                    ->nullable()
                    ->after('course_type')
                    ->comment('Stream: Science/Commerce/Arts/Engineering/Management');
            }

            if (!Schema::hasColumn('courses', 'mode')) {
                $table->enum('mode', ['Full-Time', 'Part-Time', 'Distance', 'Hybrid'])
                    ->default('Full-Time')
                    ->after('stream')
                    ->comment('Delivery Mode');
            }

            if (!Schema::hasColumn('courses', 'academic_level')) {
                $table->enum('academic_level', ['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate'])
                    ->nullable()
                    ->after('mode')
                    ->comment('Academic Level');
            }

            // Improved duration structure
            if (!Schema::hasColumn('courses', 'duration_value')) {
                $table->integer('duration_value')
                    ->nullable()
                    ->after('academic_level')
                    ->comment('Duration value (e.g., 2, 4)');
            }

            if (!Schema::hasColumn('courses', 'duration_type')) {
                $table->enum('duration_type', ['Years', 'Months', 'Weeks'])
                    ->default('Years')
                    ->after('duration_value')
                    ->comment('Duration type: Years/Months/Weeks');
            }

            // Credits system
            if (!Schema::hasColumn('courses', 'total_credits')) {
                $table->integer('total_credits')
                    ->nullable()
                    ->after('total_semesters')
                    ->comment('Total credits for the course');
            }

            // Admission & eligibility
            if (!Schema::hasColumn('courses', 'intake_capacity')) {
                $table->integer('intake_capacity')
                    ->nullable()
                    ->after('total_credits')
                    ->comment('Number of students allowed');
            }

            if (!Schema::hasColumn('courses', 'eligibility')) {
                $table->text('eligibility')
                    ->nullable()
                    ->after('intake_capacity')
                    ->comment('Eligibility criteria for admission');
            }

            if (!Schema::hasColumn('courses', 'min_qualification')) {
                $table->string('min_qualification')
                    ->nullable()
                    ->after('eligibility')
                    ->comment('Minimum qualification required');
            }

            if (!Schema::hasColumn('courses', 'entrance_required')) {
                $table->boolean('entrance_required')
                    ->default(false)
                    ->after('min_qualification')
                    ->comment('Whether entrance exam is required');
            }

            // Course coordination
            if (!Schema::hasColumn('courses', 'course_coordinator_id')) {
                $table->foreignId('course_coordinator_id')
                    ->nullable()
                    ->after('entrance_required')
                    ->constrained('users')
                    ->onDelete('set null')
                    ->comment('Course Coordinator (Staff)');
            }

            // Fees information
            if (!Schema::hasColumn('courses', 'total_fees')) {
                $table->decimal('total_fees', 12, 2)
                    ->nullable()
                    ->after('course_coordinator_id')
                    ->comment('Total fees for entire course');
            }

            if (!Schema::hasColumn('courses', 'fees_per_semester')) {
                $table->decimal('fees_per_semester', 12, 2)
                    ->nullable()
                    ->after('total_fees')
                    ->comment('Fees per semester');
            }

            // Status tracking
            if (!Schema::hasColumn('courses', 'is_active')) {
                $table->boolean('is_active')
                    ->default(true)
                    ->after('fees_per_semester')
                    ->comment('Active status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $columns = [
                'course_type',
                'stream',
                'mode',
                'academic_level',
                'duration_value',
                'duration_type',
                'total_credits',
                'intake_capacity',
                'eligibility',
                'min_qualification',
                'entrance_required',
                'course_coordinator_id',
                'total_fees',
                'fees_per_semester',
                'is_active',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('courses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
