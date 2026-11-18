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
        if (!Schema::hasTable('system_permissions')) {
            Schema::create('system_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique(); // e.g., 'create_student', 'view_attendance'
                $table->string('module'); // e.g., 'students', 'attendance', 'placement', 'courses'
                $table->text('description')->nullable();
                $table->timestamps();

                $table->index('module');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_permissions');
    }
};
