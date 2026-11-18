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
        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                // Drop old columns
                $table->dropColumn(['hod', 'staff_count', 'accent']);

                // Add new columns if they don't exist
                if (!Schema::hasColumn('departments', 'description')) {
                    $table->text('description')->nullable()->after('code');
                }
                if (!Schema::hasColumn('departments', 'hod_id')) {
                    $table->unsignedBigInteger('hod_id')->nullable()->after('description');
                }
                if (!Schema::hasColumn('departments', 'email')) {
                    $table->string('email')->nullable()->after('hod_id');
                }
                if (!Schema::hasColumn('departments', 'phone')) {
                    $table->string('phone')->nullable()->after('email');
                }
                if (!Schema::hasColumn('departments', 'intake_capacity')) {
                    $table->unsignedInteger('intake_capacity')->default(0)->after('phone');
                }
                if (!Schema::hasColumn('departments', 'status')) {
                    $table->enum('status', ['active', 'inactive'])->default('active')->after('intake_capacity');
                }

                // Add foreign key for HOD
                $table->foreign('hod_id')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete()
                    ->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                // Drop foreign key
                if (Schema::hasColumn('departments', 'hod_id')) {
                    $table->dropForeign(['hod_id']);
                }

                // Drop new columns
                $table->dropColumn([
                    'description',
                    'hod_id',
                    'email',
                    'phone',
                    'intake_capacity',
                    'status',
                ]);

                // Restore old columns
                $table->string('hod')->after('code');
                $table->unsignedInteger('staff_count')->default(0)->after('hod');
                $table->string('accent')->default('#24a8e8')->after('intake');
            });
        }
    }
};
