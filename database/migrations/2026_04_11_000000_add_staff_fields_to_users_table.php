<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Personal details
            $table->string('phone')->nullable()->after('email');
            $table->string('image_url')->nullable()->after('phone');
            $table->text('communication_address')->nullable()->after('image_url');
            $table->text('permanent_address')->nullable()->after('communication_address');
            $table->string('emergency_contact_person')->nullable()->after('permanent_address');
            $table->string('emergency_contact_number')->nullable()->after('emergency_contact_person');
            
            // Academic/Professional details
            $table->string('biometric_id')->nullable()->unique()->after('emergency_contact_number');
            $table->integer('experience_years')->nullable()->after('biometric_id');
            $table->string('specialization')->nullable()->after('experience_years');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'image_url',
                'communication_address',
                'permanent_address',
                'emergency_contact_person',
                'emergency_contact_number',
                'biometric_id',
                'experience_years',
                'specialization',
            ]);
        });
    }
};
