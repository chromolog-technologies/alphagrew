<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop the custom permission tables no longer needed - using only Spatie permissions now.
     */
    public function up(): void
    {
        // Drop designation_permission pivot table (no longer used)
        if (Schema::hasTable('designation_permission')) {
            Schema::drop('designation_permission');
        }

        // Drop system_permissions table (no longer used)
        if (Schema::hasTable('system_permissions')) {
            Schema::drop('system_permissions');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-create system_permissions if rolling back
        if (!Schema::hasTable('system_permissions')) {
            Schema::create('system_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('module');
                $table->text('description')->nullable();
                $table->timestamps();
                $table->index('module');
            });
        }

        // Re-create designation_permission if rolling back
        if (!Schema::hasTable('designation_permission')) {
            Schema::create('designation_permission', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('designation_id');
                $table->unsignedBigInteger('permission_id');
                $table->timestamps();

                $table->foreign('designation_id')
                    ->references('id')
                    ->on('designations')
                    ->onDelete('cascade');

                $table->foreign('permission_id')
                    ->references('id')
                    ->on('system_permissions')
                    ->onDelete('cascade');

                $table->unique(['designation_id', 'permission_id']);
                $table->index('designation_id');
                $table->index('permission_id');
            });
        }
    }
};
