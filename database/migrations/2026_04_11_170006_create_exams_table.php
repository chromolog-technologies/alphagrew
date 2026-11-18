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
        if (!Schema::hasTable('exams')) {
            Schema::create('exams', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // E.g., "Mid Semester - 1"
                $table->foreignId('subject_id')->constrained()->onDelete('cascade');
                $table->foreignId('class_id')->constrained()->onDelete('cascade');
                $table->date('exam_date');
                $table->time('start_time');
                $table->time('end_time');
                $table->integer('total_marks')->default(100);
                $table->integer('passing_marks')->default(40);
                $table->string('room')->nullable();
                $table->text('instructions')->nullable();
                $table->enum('status', ['scheduled', 'ongoing', 'completed'])->default('scheduled');
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
