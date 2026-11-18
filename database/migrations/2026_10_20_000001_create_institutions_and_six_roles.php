<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * First step of the role model in the PRD addendum "User Roles and Access":
 * institutions exist, users belong to one, and accounts move to the six roles.
 * Tenant scoping of the other tables (college_id → institution_id) follows in the
 * tenant-foundation migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();
            $table->string('status')->default('active');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Carry over any colleges already created, then make sure a default institution exists.
        if (Schema::hasTable('colleges')) {
            foreach (DB::table('colleges')->get() as $college) {
                DB::table('institutions')->insert([
                    'id' => $college->id,
                    'name' => $college->name,
                    'code' => strtoupper($college->code),
                    'slug' => strtolower($college->code),
                    'status' => $college->status ?? 'active',
                    'created_at' => $college->created_at ?? now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $defaultId = DB::table('institutions')->where('code', 'DEFAULT')->value('id')
            ?? DB::table('institutions')->insertGetId([
                'name' => 'Default Institution',
                'code' => 'DEFAULT',
                'slug' => 'default',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('institution_id')
                ->nullable()
                ->after('role')
                ->constrained('institutions')
                ->restrictOnDelete();
        });

        $hasCollegeId = Schema::hasColumn('users', 'college_id');

        DB::table('users')->orderBy('id')->each(function (object $user) use ($defaultId, $hasCollegeId): void {
            DB::table('users')->where('id', $user->id)->update([
                'institution_id' => $hasCollegeId && $user->college_id ? $user->college_id : $defaultId,
            ]);
        });

        // admin → institution_admin
        DB::table('users')->where('role', 'admin')->update(['role' => 'institution_admin']);

        // Staff holding a placement designation become Placement Officers.
        $placementDesignationIds = DB::table('designations')
            ->where(function ($query): void {
                $query->where('slug', 'like', '%placement%')
                    ->orWhere('name', 'like', '%placement%')
                    ->orWhere('slug', 'like', '%tpo%');
            })
            ->pluck('id');

        if ($placementDesignationIds->isNotEmpty()) {
            DB::table('users')
                ->where('role', 'staff')
                ->whereIn('designation_id', $placementDesignationIds)
                ->update(['role' => 'placement_officer']);
        }

        // Super Admin and Recruiter sit outside any institution.
        DB::table('users')->whereIn('role', ['super_admin', 'recruiter'])->update(['institution_id' => null]);

        // Spatie role names follow the users.role column; rename so existing role assignments carry over.
        if (Schema::hasTable('roles')) {
            $institutionAdminExists = DB::table('roles')
                ->where('name', 'institution_admin')
                ->where('guard_name', 'sanctum')
                ->exists();

            if (! $institutionAdminExists) {
                DB::table('roles')
                    ->where('name', 'admin')
                    ->where('guard_name', 'sanctum')
                    ->update(['name' => 'institution_admin']);
            }
        }
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'institution_admin')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'placement_officer')->update(['role' => 'staff']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('institution_id');
        });

        Schema::dropIfExists('institutions');
    }
};
