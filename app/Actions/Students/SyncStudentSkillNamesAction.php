<?php

namespace App\Actions\Students;

use App\Models\Student;
use App\Models\StudentSkill;
use App\Services\Skills\SkillResolver;

/**
 * Sets a student's self-reported skills from free-text names (admin/staff student form,
 * demo seeder). New skills start at level 3. Skills that came from a resume or an
 * assessment are never removed here.
 */
class SyncStudentSkillNamesAction
{
    public function __construct(private readonly SkillResolver $resolver)
    {
    }

    /**
     * @param  list<string>  $names
     */
    public function execute(Student $student, array $names): void
    {
        $skillIds = $this->resolver->resolveMany($names, $student->institution_id)->pluck('id');

        StudentSkill::withoutGlobalScopes()
            ->where('student_id', $student->id)
            ->where('source', StudentSkill::SOURCE_SELF)
            ->whereNotIn('skill_id', $skillIds)
            ->delete();

        $existing = StudentSkill::withoutGlobalScopes()
            ->where('student_id', $student->id)
            ->pluck('skill_id');

        foreach ($skillIds->diff($existing) as $skillId) {
            StudentSkill::query()->create([
                'institution_id' => $student->institution_id,
                'student_id' => $student->id,
                'skill_id' => $skillId,
                'level' => 3,
                'source' => StudentSkill::SOURCE_SELF,
            ]);
        }

        $student->unsetRelation('studentSkills');
    }
}
