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
        if (!Schema::hasTable('marks')) {
            Schema::create('marks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained()->onDelete('cascade');
                $table->foreignId('exam_id')->constrained()->onDelete('cascade');
                $table->foreignId('subject_id')->constrained()->onDelete('cascade');
                $table->integer('marks_obtained')->nullable();
                $table->integer('total_marks')->default(100);
                $table->decimal('percentage', 5, 2)->nullable();
                $table->char('grade', 2)->nullable(); // A+, A, B, C, D, F, etc.
                $table->text('remarks')->nullable();
                $table->foreignId('entered_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['student_id', 'exam_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marks');
    }
};
