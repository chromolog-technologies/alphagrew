<?php

namespace App\Actions\Resumes;

use App\Models\Resume;
use App\Models\StudentSkill;
use App\Services\Skills\SkillResolver;

/**
 * Upserts the skills found in a parsed resume into student_skills with source = resume and
 * no verified level (spec §3 step 3). Existing rows keep their source and level, so a resume
 * never overrides what the student stated or an assessment verified; only the evidence date moves.
 */
class SyncResumeSkillsAction
{
    private const LEVEL_HINTS = ['beginner' => 2, 'basic' => 2, 'intermediate' => 3, 'proficient' => 4, 'advanced' => 4, 'expert' => 5];

    public function __construct(private readonly SkillResolver $skills)
    {
    }

    /** @return int number of skills newly added */
    public function execute(Resume $resume): int
    {
        $parsed = $resume->parsed_data ?? [];
        $hints = collect($parsed['skills'] ?? [])
            ->mapWithKeys(fn (array $skill) => [strtolower($skill['name']) => strtolower((string) ($skill['proficiencyHint'] ?? ''))]);
        $names = $hints->keys()
            ->merge(collect($parsed['projects'] ?? [])->flatMap(fn (array $project) => $project['techStack'] ?? [])->map(fn ($name) => strtolower($name)))
            ->unique()
            ->values()
            ->all();

        $resolved = $this->skills->resolveMany($names, $resume->institution_id);
        $existing = StudentSkill::query()->where('student_id', $resume->student_id)->pluck('skill_id')->map(fn ($id) => (int) $id)->all();
        $added = 0;

        StudentSkill::query()->where('student_id', $resume->student_id)->whereIn('skill_id', $resolved->pluck('id'))->update(['last_evidence_at' => now()]);

        foreach ($resolved as $skill) {
            if (in_array($skill->id, $existing, true)) {
                continue;
            }

            StudentSkill::query()->create([
                'institution_id' => $resume->institution_id,
                'student_id' => $resume->student_id,
                'skill_id' => $skill->id,
                'level' => self::LEVEL_HINTS[$hints->get(strtolower($skill->name), '')] ?? 3,
                'source' => StudentSkill::SOURCE_RESUME,
                'verified_level' => null,
                'last_evidence_at' => now(),
            ]);
            $added++;
        }

        return $added;
    }
}
