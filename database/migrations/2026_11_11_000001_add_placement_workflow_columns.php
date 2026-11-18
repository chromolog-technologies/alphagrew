<?php

use App\Support\Placement\LegacyCompanyImporter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Placement workflow on the job-posting model (PRD v1.1 §6 and §10): student opt-out and
 * debarment, offers on applications, rounds and results per job, and the user's notification
 * preferences. Companies created before this point are copied into drives and postings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->timestamp('placement_opted_out_at')->nullable();
            $table->date('debarred_until')->nullable();
            $table->string('debar_reason', 500)->nullable();
        });

        Schema::table('job_applications', function (Blueprint $table) {
            $table->decimal('offer_ctc_lpa', 8, 2)->nullable();
            $table->timestamp('offered_at')->nullable();
            $table->timestamp('offer_respond_by')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->string('offer_note', 500)->nullable();
            $table->index(['institution_id', 'status']);
        });

        Schema::table('job_postings', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
        });

        Schema::table('placement_rounds', function (Blueprint $table) {
            $table->foreignId('job_posting_id')->nullable()->constrained('job_postings')->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence')->default(1);
        });

        Schema::table('placement_results', function (Blueprint $table) {
            $table->foreignId('job_application_id')->nullable()->constrained('job_applications')->cascadeOnDelete();
            $table->unique(['round_id', 'job_application_id']);
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 30);
            $table->boolean('in_app')->default(true);
            $table->boolean('mail')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'category']);
        });

        // Companies created through the old screens since the first import.
        (new LegacyCompanyImporter())->import();
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');

        Schema::table('placement_results', function (Blueprint $table) {
            $table->dropUnique(['round_id', 'job_application_id']);
            $table->dropConstrainedForeignId('job_application_id');
        });

        Schema::table('placement_rounds', function (Blueprint $table) {
            $table->dropConstrainedForeignId('job_posting_id');
            $table->dropColumn('sequence');
        });

        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('published_at');
        });

        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropIndex(['institution_id', 'status']);
            $table->dropColumn(['offer_ctc_lpa', 'offered_at', 'offer_respond_by', 'responded_at', 'offer_note']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['placement_opted_out_at', 'debarred_until', 'debar_reason']);
        });
    }
};
