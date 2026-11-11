<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * User-built dashboards. Widgets (title, chart type, query spec and grid position) are kept
 * as JSON on the dashboard because they are always loaded and saved together.
 * The built-in role templates live in code (App\Services\Dashboards\DashboardTemplates).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->string('template_key', 30)->nullable();
            $table->json('widgets');
            // Who else can open it (read-only): roles and staff designations.
            $table->json('shared_roles')->nullable();
            $table->json('shared_designation_ids')->nullable();
            // Opens by default for everyone it is shared with.
            $table->boolean('audience_default')->default(false);
            // The owner's own home dashboard.
            $table->boolean('is_home')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboards');
    }
};
