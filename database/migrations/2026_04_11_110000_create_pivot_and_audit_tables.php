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
        // 1. Student Skills Pivot Table (replace JSON)
        Schema::create('student_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')
                ->constrained('students')
                ->onDelete('cascade');
            $table->string('skill');
            $table->timestamps();
            
            $table->unique(['student_id', 'skill']);
            $table->index('student_id');
        });

        // 2. Company Department Pivot Table (replace JSON)
        Schema::create('company_department', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                ->constrained('companies')
                ->onDelete('cascade');
            $table->string('department_code');
            $table->foreign('department_code')
                ->references('code')
                ->on('departments')
                ->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['company_id', 'department_code']);
            $table->index('company_id');
        });

        // 3. Activity Logs Table (Audit Trail)
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');
            $table->string('action'); // created, updated, deleted
            $table->string('model_type'); // Student, User, Company, etc
            $table->unsignedBigInteger('model_id');
            $table->json('changes')->nullable(); // old_values & new_values
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['model_type', 'model_id']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_skills');
        Schema::dropIfExists('company_department');
        Schema::dropIfExists('activity_logs');
    }
};
