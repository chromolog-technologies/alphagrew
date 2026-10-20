<?php

use App\Enums\UserRole;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * AI Interview Journey spec (documentation/ai-interview-journey-backend-spec.md) §2 and §6:
 * resumes and their analyses, interview sessions and turns, evaluations, skill gap reports,
 * recommendations, readiness history and the AI usage audit log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedInteger('file_size_bytes');
            $table->string('file_hash', 64);
            $table->string('mime_type', 100);
            $table->longText('parsed_text')->nullable();
            $table->json('parsed_data')->nullable();
            $table->enum('status', ['uploaded', 'parsing', 'parsed', 'failed'])->default('uploaded');
            $table->string('parse_error')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index('student_id');
            $table->unique(['student_id', 'file_hash']);
        });

        Schema::create('ai_resume_analyses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('resume_id')->unique()->constrained('resumes')->cascadeOnDelete();
            $table->unsignedInteger('overall_score');
            $table->unsignedInteger('ats_compatibility_score');
            $table->json('section_scores');
            $table->json('strengths');
            $table->json('improvements');
            $table->json('extracted_skills');
            $table->string('model_version', 50);
            $table->timestamps();
        });

        Schema::create('ai_interviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->foreignId('job_posting_id')->nullable()->constrained('job_postings')->nullOnDelete();
            $table->enum('mode', ['technical', 'hr', 'resume_deep_dive', 'system_design', 'mixed']);
            $table->string('target_role', 100);
            $table->enum('target_experience_level', ['fresher', 'junior', 'intermediate'])->default('fresher');
            $table->unsignedInteger('base_difficulty')->default(2);
            $table->unsignedInteger('current_difficulty')->default(2);
            $table->enum('status', ['planned', 'in_progress', 'evaluating', 'completed', 'abandoned', 'failed'])->default('planned');
            $table->unsignedInteger('time_limit_minutes')->default(20);
            $table->json('plan');
            $table->string('end_reason', 40)->nullable();
            $table->timestamp('consent_given_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index(['student_id', 'status']);
        });

        Schema::create('ai_interview_turns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('interview_id')->constrained('ai_interviews')->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->enum('kind', ['question', 'follow_up', 'clarification', 'system_hint'])->default('question');
            $table->string('competency', 100);
            $table->unsignedInteger('difficulty');
            $table->text('question_text');
            $table->string('question_audio_url')->nullable();
            $table->text('answer_text')->nullable();
            $table->string('answer_audio_path')->nullable();
            $table->unsignedInteger('answer_duration_seconds')->nullable();
            $table->json('quick_signal')->nullable();
            $table->timestamp('asked_at')->useCurrent();
            $table->timestamp('answered_at')->nullable();
            $table->unique(['interview_id', 'sequence']);
        });

        Schema::create('ai_interview_evaluations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('interview_id')->unique()->constrained('ai_interviews')->cascadeOnDelete();
            $table->unsignedInteger('overall_score');
            $table->json('dimension_scores');
            $table->json('competency_breakdown');
            $table->json('strengths');
            $table->json('weaknesses');
            $table->json('per_turn_evaluations');
            $table->json('recommendations');
            $table->string('rubric_version', 20)->default('1.0');
            $table->string('model_name', 50);
            $table->timestamp('evaluated_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('skill_gap_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('interview_id')->nullable()->unique()->constrained('ai_interviews')->nullOnDelete();
            $table->string('target_role', 100);
            $table->decimal('overall_match_percentage', 5, 2);
            $table->json('skill_breakdown');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamps();
            $table->index('student_id');
        });

        Schema::create('ai_recommendations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('source_type', 40); // skill_gap_report, interview_evaluation, resume_analysis
            $table->unsignedBigInteger('source_id');
            $table->string('type', 30); // practice_set, learning_resource, resume_fix, mock_interview
            $table->string('title');
            $table->text('detail');
            $table->string('skill', 100)->nullable();
            $table->json('action')->nullable();
            $table->string('priority', 10)->default('medium'); // high, medium, low
            $table->string('status', 10)->default('open'); // open, done, dismissed
            $table->timestamps();
            $table->index(['student_id', 'status']);
            $table->index(['source_type', 'source_id']);
        });

        Schema::create('readiness_scores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->decimal('overall', 5, 2)->nullable(); // null until at least one component is measured
            $table->json('components'); // { resume, academics, assessments, interview }: { score|null, weight, ... }
            $table->string('trigger', 40);
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();
            $table->index(['student_id', 'calculated_at']);
        });

        Schema::create('ai_usage_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('feature', 40);
            $table->string('provider', 30);
            $table->string('model', 60);
            $table->string('status', 20); // success, error, refused, invalid_output
            $table->nullableMorphs('subject');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->decimal('estimated_cost_usd', 10, 6)->default(0);
            $table->string('error')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['institution_id', 'feature', 'created_at']);
        });

        $this->grantStudentPermissions();
    }

    public function down(): void
    {
        foreach (['ai_usage_logs', 'readiness_scores', 'ai_recommendations', 'skill_gap_reports', 'ai_interview_evaluations',
            'ai_interview_turns', 'ai_interviews', 'ai_resume_analyses', 'resumes'] as $table) {
            Schema::dropIfExists($table);
        }
    }

    /**
     * resumes.manage and interviews.practice are new: give them to the roles that hold them in
     * CampusPermission::byRole() and to existing users, so deployed databases need no re-seed.
     */
    private function grantStudentPermissions(): void
    {
        $roles = [UserRole::SuperAdmin->value, UserRole::InstitutionAdmin->value, UserRole::Student->value];

        foreach ([CampusPermission::RESUMES_MANAGE, CampusPermission::INTERVIEWS_PRACTICE] as $name) {
            $permission = Permission::findOrCreate($name, 'sanctum');

            Role::query()->where('guard_name', 'sanctum')->whereIn('name', $roles)->get()
                ->each(fn (Role $role) => $role->givePermissionTo($permission));
            User::query()->whereIn('role', $roles)->get()
                ->each(fn (User $user) => $user->givePermissionTo($permission));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
