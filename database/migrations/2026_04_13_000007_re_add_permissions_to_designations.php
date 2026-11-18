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
            // Re-add permissions JSON column for storing permission presets
            if (!Schema::hasColumn('designations', 'permissions')) {
                Schema::table('designations', function (Blueprint $table) {
                    $table->json('permissions')->nullable()->after('description');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('designations')) {
            Schema::table('designations', function (Blueprint $table) {
                if (Schema::hasColumn('designations', 'permissions')) {
                    $table->dropColumn('permissions');
                }
            });
        }
    }
};
