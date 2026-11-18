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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('registration_number')->unique();
            $table->string('department_code');
            $table->string('year');
            $table->string('status')->default('Active');
            $table->decimal('cgpa', 3, 1)->default(0);
            $table->unsignedInteger('attendance')->default(0);
            $table->string('phone')->nullable();
            $table->string('mentor')->nullable();
            $table->string('fee_status')->default('Paid');
            $table->string('placed_company')->nullable();
            $table->json('skills')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
