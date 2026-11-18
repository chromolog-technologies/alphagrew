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
        if (!Schema::hasTable('classes')) {
            Schema::create('classes', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // E.g., "CSE-5A"
                $table->foreignId('course_id')->constrained()->onDelete('cascade');
                $table->string('batch'); // E.g., "2021-2025"
                $table->integer('semester');
                $table->foreignId('faculty_advisor_id')->nullable()->constrained('users')->onDelete('set null');
                $table->integer('strength')->default(60);
                $table->string('room')->nullable();
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
        Schema::dropIfExists('classes');
    }
};
