<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_options', function (Blueprint $table) {
            $table->id();
            $table->string('category', 80);
            $table->string('code', 80);
            $table->string('label', 120);
            $table->string('description', 255)->nullable();
            $table->unsignedInteger('sort_order')->default(1);
            $table->timestamps();

            $table->unique(['category', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_options');
    }
};
