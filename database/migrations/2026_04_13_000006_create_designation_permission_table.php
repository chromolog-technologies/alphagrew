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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('designation_permission');
    }
};
