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
        // Add is_approved column to attendance table
        if (Schema::hasTable('attendance') && !Schema::hasColumn('attendance', 'is_approved')) {
            Schema::table('attendance', function (Blueprint $table) {
                $table->boolean('is_approved')->default(false)->after('status');
                $table->index('is_approved');
            });
        }

        // Add index to improve query performance
        if (Schema::hasTable('attendance') && !Schema::hasColumn('attendance', 'subject_id')) {
            // This should already exist from previous migration, but double-check
        }

        // Create attendance_approvals audit table
        if (!Schema::hasTable('attendance_approvals')) {
            Schema::create('attendance_approvals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('attendance_id')->constrained('attendance')->onDelete('cascade');
                $table->foreignId('approved_by')->constrained('users')->onDelete('cascade');
                $table->timestamp('approved_at');
                $table->text('remarks')->nullable();
                $table->timestamps();
                
                $table->index('attendance_id');
                $table->index('approved_by');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_approvals');
        
        if (Schema::hasColumn('attendance', 'is_approved')) {
            Schema::table('attendance', function (Blueprint $table) {
                $table->dropColumn('is_approved');
            });
        }
    }
};
