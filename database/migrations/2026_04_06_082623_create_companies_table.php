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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role');
            $table->string('package_offered');
            $table->date('drive_date');
            $table->string('status')->default('Upcoming');
            $table->string('location');
            $table->string('type')->default('Placement');
            $table->unsignedInteger('applicants')->default(0);
            $table->unsignedInteger('shortlisted')->default(0);
            $table->json('eligible_departments');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
