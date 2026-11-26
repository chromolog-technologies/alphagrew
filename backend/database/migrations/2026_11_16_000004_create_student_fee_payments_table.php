<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Campus fees as record-keeping: fee_structures and student_fees already exist; this adds the
 * payments recorded against a student's fee (one receipt each) and the fees.view / fees.manage
 * permissions (admins; staff through a designation, e.g. Accounts).
 */
return new class extends Migration
{
    private const PERMISSIONS = ['fees.view', 'fees.manage'];

    public function up(): void
    {
        Schema::create('student_fee_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_fee_id')->constrained('student_fees')->cascadeOnDelete();
            $table->string('receipt_number', 40)->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('method', 20); // cash, bank_transfer, upi, card, cheque, other
            $table->string('reference', 100)->nullable();
            $table->date('paid_on');
            $table->string('remarks', 255)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('void_reason', 255)->nullable();
            $table->timestamps();

            $table->unique(['institution_id', 'receipt_number']);
            $table->index(['institution_id', 'paid_on']);
        });

        foreach (self::PERMISSIONS as $name) {
            $permissionId = DB::table('permissions')->where('name', $name)->where('guard_name', 'sanctum')->value('id')
                ?? DB::table('permissions')->insertGetId(['name' => $name, 'guard_name' => 'sanctum', 'created_at' => now(), 'updated_at' => now()]);

            foreach (DB::table('roles')->where('guard_name', 'sanctum')->whereIn('name', ['super_admin', 'institution_admin'])->pluck('id') as $roleId) {
                DB::table('role_has_permissions')->insertOrIgnore(['permission_id' => $permissionId, 'role_id' => $roleId]);
            }
            DB::table('users')->whereIn('role', ['super_admin', 'institution_admin'])->whereNull('deleted_at')->orderBy('id')
                ->chunkById(500, fn ($users) => DB::table('model_has_permissions')->insertOrIgnore($users->map(fn ($u) => [
                    'permission_id' => $permissionId, 'model_type' => User::class, 'model_id' => $u->id,
                ])->all()));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::dropIfExists('student_fee_payments');
        $ids = DB::table('permissions')->whereIn('name', self::PERMISSIONS)->pluck('id');
        DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
