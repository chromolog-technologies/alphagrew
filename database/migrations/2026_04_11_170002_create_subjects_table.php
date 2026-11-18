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
        if (!Schema::hasTable('subjects')) {
            Schema::create('subjects', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // E.g., "Database Management System"
                $table->string('code')->unique(); // E.g., "CS301"
                $table->foreignId('course_id')->constrained()->onDelete('cascade');
                $table->integer('credits')->default(4);
                $table->integer('semester'); // Which semester this subject is taught
                $table->foreignId('faculty_id')->nullable()->constrained('users')->onDelete('set null');
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
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
        Schema::dropIfExists('subjects');
    }
};
