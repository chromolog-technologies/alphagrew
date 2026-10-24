<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant isolation for the child tables missed by the tenant foundation (audit T-1, T-2):
 * each gets institution_id, copied from the parent row that already carries it, so the
 * models can use BelongsToInstitution.
 */
return new class extends Migration
{
    /** Table → [foreign key column, parent table] used to backfill institution_id. */
    private const PARENTS = [
        'company_applications' => ['company_id', 'companies'],
        'placement_rounds' => ['company_id', 'companies'],
        'placement_results' => ['company_id', 'companies'],
        'revaluation_requests' => ['student_id', 'students'],
        'marks' => ['student_id', 'students'],
    ];

    public function up(): void
    {
        $defaultId = DB::table('institutions')->where('code', 'DEFAULT')->value('id');

        foreach (self::PARENTS as $tableName => [$foreignKey, $parentTable]) {
            if (! Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'institution_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->restrictOnDelete();
                $table->index('institution_id');
            });

            DB::table($tableName)->update([
                'institution_id' => DB::raw("(select {$parentTable}.institution_id from {$parentTable} where {$parentTable}.id = {$tableName}.{$foreignKey})"),
            ]);

            // Rows whose parent no longer exists.
            DB::table($tableName)->whereNull('institution_id')->update(['institution_id' => $defaultId]);

            if (DB::table($tableName)->whereNull('institution_id')->doesntExist()) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->unsignedBigInteger('institution_id')->nullable(false)->change();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (array_keys(self::PARENTS) as $tableName) {
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
};
