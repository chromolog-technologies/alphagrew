<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Complete Department fields according to specification:
     * - Basic Info: name, code, description
     * - Management: hod_id (foreign key to staff), contact_email, phone
     * - Capacity: intake_capacity
     * - Status & Control: status, created_at, updated_at
     */
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Check if columns exist before adding them
            if (!Schema::hasColumn('departments', 'description')) {
                $table->text('description')->nullable()->after('code');
            }
            
            if (!Schema::hasColumn('departments', 'hod_id')) {
                $table->unsignedBigInteger('hod_id')->nullable()->after('code');
                $table->foreign('hod_id')->references('id')->on('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('departments', 'contact_email')) {
                $table->string('contact_email')->nullable()->after('code');
            }
            
            if (!Schema::hasColumn('departments', 'phone')) {
                $table->string('phone')->nullable()->after('contact_email');
            }
            
            if (!Schema::hasColumn('departments', 'intake_capacity')) {
                $table->unsignedInteger('intake_capacity')->default(0)->after('phone');
            }
            
            if (!Schema::hasColumn('departments', 'status')) {
                $table->enum('status', ['active', 'inactive'])->default('active')->after('intake_capacity');
            }
            
            // Drop old columns if they exist (backup compatibility)
            if (Schema::hasColumn('departments', 'hod') && Schema::hasColumn('departments', 'hod_id')) {
                $table->dropColumn('hod');
            }
            
            if (Schema::hasColumn('departments', 'intake') && Schema::hasColumn('departments', 'intake_capacity')) {
                $table->dropColumn('intake');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Drop new columns
            if (Schema::hasColumn('departments', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('departments', 'hod_id')) {
                $table->dropForeign(['hod_id']);
                $table->dropColumn('hod_id');
            }
            if (Schema::hasColumn('departments', 'contact_email')) {
                $table->dropColumn('contact_email');
            }
            if (Schema::hasColumn('departments', 'phone')) {
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('departments', 'intake_capacity')) {
                $table->dropColumn('intake_capacity');
            }
            if (Schema::hasColumn('departments', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
