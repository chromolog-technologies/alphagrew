<?php

use App\Support\Campus\SkillCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Student Journey spec, steps 2 and 6: student profile, projects, certifications,
 * experience, the skills catalogue, and student_skills rebuilt on top of it.
 * Existing free-text skills (students.skills JSON) are mapped onto the catalogue.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->unique()->constrained('students')->cascadeOnDelete();
            $table->string('headline', 160)->nullable();
            $table->text('about')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('alternate_email')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('github_url')->nullable();
            $table->string('portfolio_url')->nullable();
            $table->string('photo_path')->nullable();
            $table->json('preferred_roles')->nullable();
            $table->json('preferred_locations')->nullable();
            $table->boolean('willing_to_relocate')->default(true);
            $table->json('visibility')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('student_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('tech_stack')->nullable();
            $table->string('url')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['student_id', 'sort_order']);
        });

        Schema::create('student_certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('name');
            $table->string('issuer');
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('credential_url')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['student_id', 'sort_order']);
        });

        Schema::create('student_experience', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('type', 20); // internship, job, freelance
            $table->string('organisation');
            $table->string('role');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['student_id', 'sort_order']);
        });

        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            // null = platform catalogue, shared by every institution
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('slug', 120);
            $table->string('lookup_key', 120); // SkillCatalog::key(), for alias-insensitive matching
            $table->string('category', 20);
            $table->json('aliases')->nullable();
            $table->boolean('needs_review')->default(false);
            $table->timestamps();
            $table->unique(['institution_id', 'slug']);
            $table->index('lookup_key');
        });

        // student_skills was never used by the application; rebuild it on the catalogue.
        $legacyRows = Schema::hasTable('student_skills') ? DB::table('student_skills')->get(['student_id', 'skill']) : collect();
        Schema::dropIfExists('student_skills');

        Schema::create('student_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained('skills')->cascadeOnDelete();
            $table->unsignedTinyInteger('level')->default(3); // 1-5, self-rated
            $table->string('source', 20)->default('self'); // self, resume, assessment
            $table->unsignedTinyInteger('verified_level')->nullable(); // from assessments
            $table->timestamp('last_evidence_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'skill_id']);
        });

        $this->seedPlatformSkills();
        $this->migrateExistingSkills($legacyRows);
    }

    public function down(): void
    {
        Schema::dropIfExists('student_skills');
        Schema::create('student_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('skill');
            $table->timestamps();
            $table->unique(['student_id', 'skill']);
            $table->index('student_id');
        });

        Schema::dropIfExists('skills');
        Schema::dropIfExists('student_experience');
        Schema::dropIfExists('student_certifications');
        Schema::dropIfExists('student_projects');
        Schema::dropIfExists('student_profiles');
    }

    private function seedPlatformSkills(): void
    {
        $now = now();

        DB::table('skills')->insert(array_map(fn (array $skill) => [
            'institution_id' => null,
            'name' => $skill['name'],
            'slug' => SkillCatalog::slug($skill['name']),
            'lookup_key' => SkillCatalog::key($skill['name']),
            'category' => $skill['category'],
            'aliases' => json_encode($skill['aliases']),
            'needs_review' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ], SkillCatalog::defaults()));
    }

    /**
     * Maps students.skills JSON (and any legacy student_skills rows) onto catalogue skills.
     */
    private function migrateExistingSkills($legacyRows): void
    {
        $platform = [];
        foreach (DB::table('skills')->whereNull('institution_id')->get() as $skill) {
            $platform[$skill->lookup_key] = $skill->id;
            foreach (json_decode($skill->aliases ?? '[]', true) as $alias) {
                $platform[SkillCatalog::key($alias)] ??= $skill->id;
            }
        }

        $namesByStudent = [];
        foreach (DB::table('students')->get(['id', 'institution_id', 'skills']) as $student) {
            $namesByStudent[$student->id] = [
                'institution_id' => $student->institution_id,
                'names' => json_decode($student->skills ?? '[]', true) ?: [],
            ];
        }
        foreach ($legacyRows as $row) {
            if (isset($namesByStudent[$row->student_id])) {
                $namesByStudent[$row->student_id]['names'][] = $row->skill;
            }
        }

        $institutionSkills = [];
        $now = now();

        foreach ($namesByStudent as $studentId => ['institution_id' => $institutionId, 'names' => $names]) {
            foreach (array_unique(array_filter(array_map('trim', $names))) as $name) {
                $key = SkillCatalog::key($name);
                if ($key === '') {
                    continue;
                }

                $skillId = $platform[$key]
                    ?? ($institutionSkills["{$institutionId}:{$key}"] ??= DB::table('skills')->insertGetId([
                        'institution_id' => $institutionId,
                        'name' => $name,
                        'slug' => SkillCatalog::slug($name),
                        'lookup_key' => $key,
                        'category' => 'domain',
                        'aliases' => '[]',
                        'needs_review' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]));

                DB::table('student_skills')->insertOrIgnore([
                    'institution_id' => $institutionId,
                    'student_id' => $studentId,
                    'skill_id' => $skillId,
                    'level' => 3,
                    'source' => 'self',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
};
