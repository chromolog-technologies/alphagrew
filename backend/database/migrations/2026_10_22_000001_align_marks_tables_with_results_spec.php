<?php

use App\Enums\UserRole;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Academic Results spec (documentation/academic-results-backend-spec.md) §6:
 * - grade_rules: 10-point grade_point, decimal score bands (89.99), is_pass verdict.
 * - mark_schemes: *_max / *_pass per component.
 * - mark_entries: five-state lifecycle with who/when per stage and the stored grade point.
 * - semester_results: credit-weighted SGPA with total / earned credits.
 * - result_publishing_logs: per institution, with entry count, IP and unlock reason.
 * - subject_allocations: per institution (faculty ↔ subject per semester).
 * - student_academic_summaries: semesters_published.
 * - notifications: Laravel database notifications (marks rejected back to faculty).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grade_rules', function (Blueprint $table): void {
            $table->renameColumn('gpa', 'grade_point');
        });
        Schema::table('grade_rules', function (Blueprint $table): void {
            $table->decimal('grade_point', 4, 2)->default(0)->change();
            $table->decimal('min_score', 5, 2)->change();
            $table->decimal('max_score', 5, 2)->change();
            $table->string('grade', 5)->change();
            $table->boolean('is_pass')->default(true)->after('grade_point');
        });
        DB::table('grade_rules')->where('grade_point', '<=', 0)->update(['is_pass' => false]);

        Schema::table('mark_schemes', function (Blueprint $table): void {
            $table->renameColumn('internal_marks', 'internal_max');
            $table->renameColumn('external_marks', 'external_max');
            $table->renameColumn('total_marks', 'total_max');
            $table->renameColumn('pass_mark', 'total_pass');
        });
        Schema::table('mark_schemes', function (Blueprint $table): void {
            $table->decimal('internal_max', 5, 2)->default(40)->change();
            $table->decimal('external_max', 5, 2)->default(60)->change();
            $table->decimal('total_max', 5, 2)->default(100)->change();
            $table->decimal('total_pass', 5, 2)->default(40)->change();
            $table->decimal('internal_pass', 5, 2)->default(0)->after('total_max');
            $table->decimal('external_pass', 5, 2)->default(0)->after('internal_pass');
        });
        // Existing schemes get the conventional 40% minimum per component.
        DB::table('mark_schemes')->update([
            'internal_pass' => DB::raw('ROUND(internal_max * 0.4, 2)'),
            'external_pass' => DB::raw('ROUND(external_max * 0.4, 2)'),
        ]);

        // "published" was never a separate stage: published marks are locked.
        DB::table('mark_entries')->where('status', 'published')->update(['status' => 'locked']);
        Schema::table('mark_entries', function (Blueprint $table): void {
            $table->enum('status', ['draft', 'submitted', 'verified', 'approved', 'locked'])->default('draft')->change();
            $table->string('grade', 5)->nullable()->change();
            $table->decimal('grade_point', 4, 2)->nullable()->after('grade');
            $table->timestamp('submitted_at')->nullable()->after('entered_by');
            $table->foreignId('approved_by')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->timestamp('locked_at')->nullable()->after('approved_at');
            $table->index(['institution_id', 'status']);
        });
        DB::table('mark_entries')->where('status', 'locked')->update(['locked_at' => DB::raw('published_at')]);

        Schema::table('semester_results', function (Blueprint $table): void {
            $table->renameColumn('gpa', 'sgpa');
        });
        Schema::table('semester_results', function (Blueprint $table): void {
            $table->decimal('sgpa', 4, 2)->default(0)->change();
            $table->unsignedSmallInteger('total_credits')->default(0)->after('sgpa');
            $table->unsignedSmallInteger('credits_earned')->default(0)->after('total_credits');
        });

        $this->alignPublishingLogs();
        $this->addInstitutionTo('subject_allocations', 'subjects', 'subject_id');

        Schema::table('student_academic_summaries', function (Blueprint $table): void {
            $table->unsignedSmallInteger('semesters_published')->default(0)->after('subjects_published');
        });

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        $this->grantResultsSummaryPermission();
    }

    /**
     * results.view_summary is new: give it to the roles that hold it in CampusPermission::byRole()
     * and their existing users, so deployed databases need no re-seed. Fresh installs get it
     * from SpatiePermissionsSeeder.
     */
    private function grantResultsSummaryPermission(): void
    {
        $roles = [UserRole::SuperAdmin->value, UserRole::InstitutionAdmin->value, UserRole::PlacementOfficer->value];
        $permission = Permission::findOrCreate(CampusPermission::RESULTS_VIEW_SUMMARY, 'sanctum');

        Role::query()->where('guard_name', 'sanctum')->whereIn('name', $roles)->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permission));
        User::query()->whereIn('role', $roles)->get()
            ->each(fn (User $user) => $user->givePermissionTo($permission));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');

        Schema::table('student_academic_summaries', function (Blueprint $table): void {
            $table->dropColumn('semesters_published');
        });

        Schema::table('subject_allocations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('institution_id');
        });

        Schema::table('result_publishing_logs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('institution_id');
            $table->dropColumn(['entries_count', 'ip_address', 'reason']);
            $table->string('action', 20)->default('publish')->change();
        });
        DB::table('result_publishing_logs')->where('action', 'published')->update(['action' => 'publish']);
        DB::table('result_publishing_logs')->where('action', 'unlocked')->update(['action' => 'unlock']);

        Schema::table('semester_results', function (Blueprint $table): void {
            $table->dropColumn(['total_credits', 'credits_earned']);
            $table->renameColumn('sgpa', 'gpa');
        });

        Schema::table('mark_entries', function (Blueprint $table): void {
            $table->dropIndex(['institution_id', 'status']);
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn(['grade_point', 'submitted_at', 'approved_at', 'locked_at']);
            $table->enum('status', ['draft', 'submitted', 'verified', 'approved', 'published', 'locked'])->default('draft')->change();
        });

        Schema::table('mark_schemes', function (Blueprint $table): void {
            $table->dropColumn(['internal_pass', 'external_pass']);
        });
        Schema::table('mark_schemes', function (Blueprint $table): void {
            $table->renameColumn('internal_max', 'internal_marks');
            $table->renameColumn('external_max', 'external_marks');
            $table->renameColumn('total_max', 'total_marks');
            $table->renameColumn('total_pass', 'pass_mark');
        });

        Schema::table('grade_rules', function (Blueprint $table): void {
            $table->dropColumn('is_pass');
            $table->renameColumn('grade_point', 'gpa');
        });
    }

    private function alignPublishingLogs(): void
    {
        $this->addInstitutionTo('result_publishing_logs', 'semesters', 'semester_id');

        Schema::table('result_publishing_logs', function (Blueprint $table): void {
            $table->string('action', 20)->default('published')->change();
            $table->unsignedInteger('entries_count')->default(0)->after('students_published');
            $table->string('ip_address', 45)->nullable()->after('entries_count');
            $table->text('reason')->nullable()->after('ip_address');
        });

        DB::table('result_publishing_logs')->whereIn('action', ['unlock', 'revert'])->update([
            'action' => 'unlocked',
            'reason' => DB::raw('details'),
        ]);
        DB::table('result_publishing_logs')->where('action', '!=', 'unlocked')->update(['action' => 'published']);

        Schema::table('result_publishing_logs', function (Blueprint $table): void {
            $table->enum('action', ['published', 'unlocked'])->default('published')->change();
        });
    }

    /** Adds a required institution_id, copied from the row's parent ($parentTable via $foreignKey). */
    private function addInstitutionTo(string $tableName, string $parentTable, string $foreignKey): void
    {
        Schema::table($tableName, function (Blueprint $table): void {
            $table->foreignId('institution_id')->nullable()->after('id')->constrained('institutions')->restrictOnDelete();
        });

        DB::table($tableName)->update([
            'institution_id' => DB::raw("(select {$parentTable}.institution_id from {$parentTable} where {$parentTable}.id = {$tableName}.{$foreignKey})"),
        ]);

        Schema::table($tableName, function (Blueprint $table): void {
            $table->unsignedBigInteger('institution_id')->nullable(false)->change();
        });
    }
};
