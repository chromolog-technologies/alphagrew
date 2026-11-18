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
        // 1. Add Soft Deletes to Students
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // 2. Add Soft Deletes to Users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // 3. Add Soft Deletes to CompanyApplication
        Schema::table('company_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('company_applications', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('company_applications', function (Blueprint $table) {
            if (Schema::hasColumn('company_applications', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
