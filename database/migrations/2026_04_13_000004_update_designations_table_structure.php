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
        if (Schema::hasTable('designations')) {
            Schema::table('designations', function (Blueprint $table) {
                // Add department_id if it doesn't exist
                if (!Schema::hasColumn('designations', 'department_id')) {
                    $table->unsignedBigInteger('department_id')->nullable()->after('id');
                    $table->foreign('department_id')
                        ->references('id')
                        ->on('departments')
                        ->nullOnDelete();
                }

                // Add status if it doesn't exist
                if (!Schema::hasColumn('designations', 'status')) {
                    $table->enum('status', ['active', 'inactive'])->default('active')->after('description');
                }

                // Drop permissions JSON column if it exists
                if (Schema::hasColumn('designations', 'permissions')) {
                    $table->dropColumn('permissions');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('designations')) {
            Schema::table('designations', function (Blueprint $table) {
                // Drop foreign key
                if (Schema::hasColumn('designations', 'department_id')) {
                    $table->dropForeign(['department_id']);
                    $table->dropColumn('department_id');
                }

                // Drop status column
                if (Schema::hasColumn('designations', 'status')) {
                    $table->dropColumn('status');
                }

                // Restore permissions JSON column
                $table->json('permissions')->nullable();
            });
        }
    }
};
