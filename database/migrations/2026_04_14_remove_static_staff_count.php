<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fix: Remove old static staff_count field
     * Instead: Dynamically count staff from users table
     * Staff for department = Users where department_code = dept.code AND role IN ('staff', 'hod')
     */
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Remove old staff_count column (was static, now dynamic)
            if (Schema::hasColumn('departments', 'staff_count')) {
                $table->dropColumn('staff_count');
            }
            
            // Remove old hod string field (replaced by hod_id foreign key)
            if (Schema::hasColumn('departments', 'hod') && !Schema::hasColumn('departments', 'hod_id')) {
                $table->dropColumn('hod');
            }
            
            // Remove old intake field (replaced by intake_capacity)
            if (Schema::hasColumn('departments', 'intake')) {
                $table->dropColumn('intake');
            }
            
            // Remove old accent field (UI-related, not in specification)
            if (Schema::hasColumn('departments', 'accent')) {
                $table->dropColumn('accent');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Restore old fields if needed
            if (!Schema::hasColumn('departments', 'staff_count')) {
                $table->unsignedInteger('staff_count')->default(0)->after('code');
            }
            
            if (!Schema::hasColumn('departments', 'hod')) {
                $table->string('hod')->after('code');
            }
            
            if (!Schema::hasColumn('departments', 'intake')) {
                $table->unsignedInteger('intake')->default(0);
            }
            
            if (!Schema::hasColumn('departments', 'accent')) {
                $table->string('accent')->default('#24a8e8');
            }
        });
    }
};
