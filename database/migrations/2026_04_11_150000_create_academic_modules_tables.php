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
        // 1. Academic Years Table
        if (!Schema::hasTable('academic_years')) {
            Schema::create('academic_years', function (Blueprint $table) {
                $table->id();
                $table->string('year'); // e.g., '2023-2024'
                $table->string('code')->unique(); // e.g., 'AY2023-24'
                $table->date('start_date');
                $table->date('end_date');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('is_active');
            });
        }

        // 2. Semesters Table
        if (!Schema::hasTable('semesters')) {
            Schema::create('semesters', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
                $table->string('name'); // Spring, Fall, Winter, Summer
                $table->integer('semester_number'); // 1, 2, 3, etc.
                $table->date('start_date');
                $table->date('end_date');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('academic_year_id');
                $table->index('is_active');
                $table->unique(['academic_year_id', 'semester_number']);
            });
        }

        // 3. Courses / Programs Table
        if (!Schema::hasTable('courses')) {
            Schema::create('courses', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // B.Tech, B.Sc, MBA
                $table->string('code')->unique(); // BTECH, MBA
                $table->text('description')->nullable();
                $table->foreignId('department_id')->constrained('departments')->onDelete('cascade');
                $table->integer('duration_years');
                $table->integer('total_semesters');
                $table->string('stream')->nullable(); // CS, EC, Mechanical, etc.
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('department_id');
                $table->index('is_active');
            });
        }

        // 4. Subjects / Courses Table
        if (!Schema::hasTable('subjects')) {
            Schema::create('subjects', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->text('description')->nullable();
                $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
                $table->integer('semester_number'); // 1-8
                $table->integer('credit_hours');
                $table->integer('lecture_hours');
                $table->integer('practical_hours')->nullable();
                $table->enum('subject_type', ['theory', 'practical', 'both'])->default('both');
                $table->boolean('is_mandatory')->default(true);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('course_id');
                $table->index('is_active');
                $table->unique(['code', 'course_id'], 'subject_code_course_unique');
            });
        }

        // 5. Subject Allocation (Faculty to Subjects)
        if (!Schema::hasTable('subject_allocations')) {
            Schema::create('subject_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->date('allocated_from');
                $table->date('allocated_to')->nullable();
                $table->timestamps();
                
                $table->index('subject_id');
                $table->index('faculty_id');
                $table->index('semester_id');
                $table->unique(['subject_id', 'faculty_id', 'semester_id'], 'subject_faculty_semester_unique');
            });
        }

        // 6. Classes / Batches Table
        if (!Schema::hasTable('classes')) {
            Schema::create('classes', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // B.Tech CS-2023 A, B.Tech CS-2023 B
                $table->string('code')->unique();
                $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->foreignId('hod_id')->nullable()->constrained('users')->onDelete('set null');
                $table->integer('total_students')->default(0);
                $table->enum('batch', ['A', 'B', 'C', 'D', 'E', 'F']);
                $table->year('admission_year');
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('course_id');
                $table->index('semester_id');
                $table->unique(['course_id', 'batch', 'admission_year'], 'course_batch_year_unique');
            });
        }

        // 7. Student Batch Assignment (Many-to-Many)
        if (!Schema::hasTable('class_student')) {
            Schema::create('class_student', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->date('assigned_from');
                $table->date('assigned_to')->nullable();
                $table->timestamps();
                
                $table->index('class_id');
                $table->index('student_id');
                $table->unique(['class_id', 'student_id'], 'class_student_unique');
            });
        }

        // 8. Attendance Table
        if (!Schema::hasTable('attendance')) {
            Schema::create('attendance', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
                $table->date('attendance_date');
                $table->enum('status', ['present', 'absent', 'leave', 'other'])->default('present');
                $table->text('remarks')->nullable();
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('student_id');
                $table->index('subject_id');
                $table->index('attendance_date');
                $table->index('faculty_id');
                $table->unique(['student_id', 'subject_id', 'attendance_date'], 'attendance_unique');
            });
        }

        // 9. Exam Types Table
        if (!Schema::hasTable('exam_types')) {
            Schema::create('exam_types', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // Mid Term, End Semester, Quiz, Assignment
                $table->string('code')->unique();
                $table->integer('max_marks')->default(100);
                $table->integer('passing_marks')->default(40);
                $table->integer('weightage')->default(100); // Percentage of final grade
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 10. Exams Table
        if (!Schema::hasTable('exams')) {
            Schema::create('exams', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // e.g., "Data Structures - Mid Term 2024"
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('exam_type_id')->constrained('exam_types')->onDelete('cascade');
                $table->foreignId('semester_id')->constrained('semesters')->onDelete('cascade');
                $table->dateTime('exam_date');
                $table->time('start_time');
                $table->time('end_time');
                $table->integer('duration_minutes');
                $table->string('location')->nullable();
                $table->integer('max_marks')->default(100);
                $table->enum('exam_mode', ['offline', 'online', 'hybrid'])->default('offline');
                $table->enum('status', ['scheduled', 'conducted', 'cancelled', 'postponed'])->default('scheduled');
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('subject_id');
                $table->index('exam_type_id');
                $table->index('exam_date');
            });
        }

        // 11. Marks / Grades Table
        if (!Schema::hasTable('marks')) {
            Schema::create('marks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('exam_id')->constrained('exams')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->decimal('marks_obtained', 5, 2)->nullable();
                $table->string('grade')->nullable(); // A, B, C, D, F
                $table->text('feedback')->nullable();
                $table->enum('status', ['pending', 'entered', 'reviewed', 'published'])->default('pending');
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('exam_id');
                $table->index('student_id');
                $table->index('status');
                $table->unique(['exam_id', 'student_id'], 'exam_student_unique');
            });
        }

        // 12. Timetable Table
        if (!Schema::hasTable('timetables')) {
            Schema::create('timetables', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
                $table->enum('day_of_week', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
                $table->time('start_time');
                $table->time('end_time');
                $table->string('room_number')->nullable();
                $table->enum('session_type', ['lecture', 'practical', 'lab', 'tutorial'])->default('lecture');
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('class_id');
                $table->index('subject_id');
                $table->index('faculty_id');
                $table->unique(['class_id', 'day_of_week', 'start_time', 'effective_from'], 'timetable_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marks');
        Schema::dropIfExists('exams');
        Schema::dropIfExists('exam_types');
        Schema::dropIfExists('timetables');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('class_student');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('subject_allocations');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('semesters');
        Schema::dropIfExists('academic_years');
    }
};
