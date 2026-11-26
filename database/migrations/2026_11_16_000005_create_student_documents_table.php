<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documents students upload (ID proof, mark sheets, certificates…) and staff verify. Files live
 * on a private disk and are served through short-lived signed URLs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('title', 150);
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size_bytes');
            $table->string('status', 20)->default('pending'); // pending, verified, rejected
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_remarks', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'student_id']);
            $table->index(['institution_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_documents');
    }
};
