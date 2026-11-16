<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Installs created by the first academic migration (2026_04_11_150000) have
 * courses.duration_years NOT NULL; the later "add if missing" migration (2026_04_13_000001)
 * meant it to be nullable but skips existing columns. The course form never sends it (it sends
 * duration_value / duration_type), so on those installs creating a course failed.
 *
 * Aligns every install on the intended schema. The controller still fills the column, so
 * reports that read it keep working.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('courses', 'duration_years')) {
            Schema::table('courses', function (Blueprint $table): void {
                $table->integer('duration_years')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        // Not reverted: making the column NOT NULL again would fail on rows saved without it.
    }
};
