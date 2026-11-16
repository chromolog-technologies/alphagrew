<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The initial academic migration (2026_04_11_150000) defined classes.batch as
 * enum('A', 'B', 'C', 'D', 'E', 'F'), confusing section letters with graduation cohorts.
 * The subsequent classes migration (2026_04_11_170004) intended batch to be a string
 * (e.g. "2021-2025" / "2025-2029"), but skipped execution because the table already existed.
 * On MySQL/MariaDB in strict mode, inserting a year range (e.g. "2025-2029") fails with
 * warning 1265 (Data truncated for column 'batch').
 *
 * This migration alters classes.batch to VARCHAR(50) so cohorts like "2025-2029" are valid.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('classes') && Schema::hasColumn('classes', 'batch')) {
            Schema::table('classes', function (Blueprint $table): void {
                $table->string('batch', 50)->change();
            });
        }
    }

    public function down(): void
    {
        // Not reverted: restoring the enum would truncate any cohort strings saved.
    }
};

