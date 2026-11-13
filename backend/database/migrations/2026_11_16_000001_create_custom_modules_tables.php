<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modules an institution admin creates (e.g. "Hostel Rooms", "Alumni Events") and their records.
 *
 * A record has a title and a status; every other attribute is a custom field, stored in
 * custom_field_definitions / custom_field_values under the entity "module_{id}".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_modules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('key', 40);
            $table->string('plural_label', 100);
            $table->string('singular_label', 100);
            $table->string('category', 30);
            $table->string('description', 255)->nullable();
            // Roles (besides admins) that may read / change the module's records.
            $table->json('view_roles')->nullable();
            $table->json('edit_roles')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Keys stay reserved after a soft delete.
            $table->unique(['institution_id', 'key']);
        });

        Schema::create('custom_module_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('custom_module_id')->constrained('custom_modules')->cascadeOnDelete();
            $table->string('title');
            $table->string('status', 20)->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Named explicitly: the generated name is longer than MySQL's 64-character limit.
            $table->index(['institution_id', 'custom_module_id', 'status'], 'cm_records_tenant_module_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_module_records');
        Schema::dropIfExists('custom_modules');
    }
};
