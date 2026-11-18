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
        if (!Schema::hasTable('fee_structures')) {
            Schema::create('fee_structures', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->foreignId('course_id')->constrained()->onDelete('cascade');
                $table->integer('semester');
                $table->decimal('tuition_fee', 12, 2)->default(0);
                $table->decimal('lab_fee', 12, 2)->default(0);
                $table->decimal('library_fee', 12, 2)->default(0);
                $table->decimal('exam_fee', 12, 2)->default(0);
                $table->decimal('other_fee', 12, 2)->default(0);
                $table->decimal('total_fee', 12, 2);
                $table->date('due_date');
                $table->text('remarks')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('student_fees')) {
            Schema::create('student_fees', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained()->onDelete('cascade');
                $table->foreignId('fee_structure_id')->constrained()->onDelete('cascade');
                $table->decimal('amount_due', 12, 2);
                $table->decimal('amount_paid', 12, 2)->default(0);
                $table->enum('status', ['pending', 'partial', 'paid'])->default('pending');
                $table->date('due_date');
                $table->date('paid_date')->nullable();
                $table->text('remarks')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['student_id', 'fee_structure_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_fees');
        Schema::dropIfExists('fee_structures');
    }
};
