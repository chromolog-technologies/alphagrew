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
        if (!Schema::hasTable('module_permissions')) {
            Schema::create('module_permissions', function (Blueprint $table) {
                $table->id();
                $table->string('module_name')->unique();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('designation_module_map')) {
            Schema::create('designation_module_map', function (Blueprint $table) {
                $table->id();
                $table->foreignId('designation_id')->constrained('designations')->cascadeOnDelete();
                $table->foreignId('module_id')->constrained('module_permissions')->cascadeOnDelete();
                $table->json('permissions')->nullable();
                $table->timestamps();

                $table->unique(['designation_id', 'module_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('designation_module_map')) {
            Schema::drop('designation_module_map');
        }

        if (Schema::hasTable('module_permissions')) {
            Schema::drop('module_permissions');
        }
    }
};
