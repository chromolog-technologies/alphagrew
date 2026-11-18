<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Expand placement_results.status enum to include round evaluation outcomes:
 * 'passed', 'failed', and 'absent' used by PlacementJobController, RoundActions,
 * PlacementDemoSeeder, and frontend placementApi, while retaining legacy values
 * ('pending', 'cleared', 'rejected', 'waitlist') for backward compatibility.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('placement_results', function (Blueprint $table) {
            $table->enum('status', ['pending', 'cleared', 'rejected', 'waitlist', 'passed', 'failed', 'absent'])
                ->default('pending')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('placement_results')->where('status', 'passed')->update(['status' => 'cleared']);
        DB::table('placement_results')->whereIn('status', ['failed', 'absent'])->update(['status' => 'rejected']);

        Schema::table('placement_results', function (Blueprint $table) {
            $table->enum('status', ['pending', 'cleared', 'rejected', 'waitlist'])
                ->default('pending')
                ->change();
        });
    }
};

