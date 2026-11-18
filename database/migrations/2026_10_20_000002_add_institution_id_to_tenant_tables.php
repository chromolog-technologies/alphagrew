<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant foundation (PRD addendum "Data Model Changes", D7 step 1):
 * every institution-owned table gets institution_id, existing rows are attached to
 * their college or the default institution, globally unique codes become unique per
 * institution, and the old colleges / college_id columns are removed.
 */
return new class extends Migration
{
    /** Tables whose rows always belong to one institution. */
    private const REQUIRED = [
        'departments', 'courses', 'subjects', 'academic_years', 'semesters', 'classes',
        'students', 'designations', 'master_options', 'announcements', 'attendance',
        'timetables', 'exams', 'mark_schemes', 'mark_entries', 'grade_rules',
        'semester_results', 'fee_structures', 'student_fees', 'companies',
    ];

    /** Tables where platform-level rows have no institution. */
    private const OPTIONAL = ['activity_logs'];

    /** Tables that carried the old college_id. */
    private const COLLEGE_ID_TABLES = ['users', 'students', 'departments', 'announcements', 'companies'];

    /** Global unique index → columns of its per-institution replacement. */
    private const UNIQUES = [
        'departments' => ['departments_code_unique' => ['code']],
        'courses' => ['courses_code_unique' => ['code']],
        'subjects' => ['subjects_code_unique' => ['code']],
        'academic_years' => ['academic_years_code_unique' => ['code']],
        'classes' => ['classes_code_unique' => ['code']],
        'students' => [
            'students_email_unique' => ['email'],
            'students_registration_number_unique' => ['registration_number'],
        ],
        'designations' => [
            'designations_slug_unique' => ['slug'],
            'designations_name_unique' => ['name'],
        ],
        'master_options' => ['master_options_category_code_unique' => ['category', 'code']],
        'grade_rules' => ['grade_rules_min_score_max_score_unique' => ['min_score', 'max_score']],
    ];

    public function up(): void
    {
        $defaultId = DB::table('institutions')->where('code', 'DEFAULT')->value('id');

        foreach ([...self::REQUIRED, ...self::OPTIONAL] as $tableName) {
            if (! Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'institution_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->restrictOnDelete();
                $table->index('institution_id');
            });

            if (in_array($tableName, self::REQUIRED, true)) {
                $this->backfill($tableName, $defaultId);

                Schema::table($tableName, function (Blueprint $table): void {
                    $table->unsignedBigInteger('institution_id')->nullable(false)->change();
                });
            }
        }

        // company_department.department_code referenced departments.code, which is no longer
        // unique on its own. The pivot is unused (companies keep eligible_departments JSON) and
        // is replaced by institution_company in the placement rework; keep the column, drop the key.
        if (Schema::hasTable('company_department')) {
            Schema::table('company_department', function (Blueprint $table): void {
                $table->dropForeign(['department_code']);
            });
        }

        foreach (self::UNIQUES as $tableName => $indexes) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            foreach ($indexes as $indexName => $columns) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexName, $columns): void {
                    if (Schema::hasIndex($tableName, $indexName)) {
                        $table->dropUnique($indexName);
                    }
                    $table->unique(['institution_id', ...$columns]);
                });
            }
        }

        foreach (self::COLLEGE_ID_TABLES as $tableName) {
            if (Schema::hasColumn($tableName, 'college_id')) {
                // Foreign key first: MySQL refuses to drop an index a foreign key still uses.
                Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                    $table->dropForeign(['college_id']);
                    if (Schema::hasIndex($tableName, "{$tableName}_college_id_index")) {
                        $table->dropIndex("{$tableName}_college_id_index");
                    }
                    $table->dropColumn('college_id');
                });
            }
        }

        Schema::dropIfExists('colleges');
    }

    public function down(): void
    {
        foreach (self::UNIQUES as $tableName => $indexes) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            foreach ($indexes as $indexName => $columns) {
                Schema::table($tableName, function (Blueprint $table) use ($columns): void {
                    $table->dropUnique(['institution_id', ...$columns]);
                    $table->unique($columns);
                });
            }
        }

        if (Schema::hasTable('company_department')) {
            Schema::table('company_department', function (Blueprint $table): void {
                $table->foreign('department_code')->references('code')->on('departments')->cascadeOnDelete();
            });
        }

        foreach ([...self::REQUIRED, ...self::OPTIONAL] as $tableName) {
            if (Schema::hasColumn($tableName, 'institution_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                    if (Schema::hasIndex($tableName, "{$tableName}_institution_id_index")) {
                        $table->dropIndex("{$tableName}_institution_id_index");
                    }
                    $table->dropConstrainedForeignId('institution_id');
                });
            }
        }
    }

    private function backfill(string $tableName, ?int $defaultId): void
    {
        if (Schema::hasColumn($tableName, 'college_id')) {
            // Colleges were copied into institutions with the same ids.
            DB::table($tableName)->whereNotNull('college_id')->update(['institution_id' => DB::raw('college_id')]);
        }

        DB::table($tableName)->whereNull('institution_id')->update(['institution_id' => $defaultId]);
    }
};
