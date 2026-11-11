<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-defined form fields for students, staff, subjects and exams.
 *
 * Values are stored one row per field per record, in a column that matches the field type,
 * so dashboards can group, filter and aggregate them with plain SQL on MySQL and SQLite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_definitions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('entity', 20);
            $table->string('key', 50);
            $table->string('label');
            $table->string('type', 20);
            $table->json('options')->nullable();
            $table->string('help_text')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Keys stay reserved after a soft delete, so old values never attach to a new field.
            $table->unique(['institution_id', 'entity', 'key']);
            $table->index(['institution_id', 'entity', 'is_active']);
        });

        Schema::create('custom_field_values', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('definition_id')->constrained('custom_field_definitions')->cascadeOnDelete();
            $table->string('entity', 20);
            $table->unsignedBigInteger('entity_id');
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 15, 4)->nullable();
            $table->date('value_date')->nullable();
            $table->timestamps();

            $table->unique(['definition_id', 'entity_id']);
            $table->index(['entity', 'entity_id']);
            $table->index(['definition_id', 'value_number']);
            $table->index(['definition_id', 'value_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('custom_field_definitions');
    }
};
