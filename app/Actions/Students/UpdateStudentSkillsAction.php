<?php

namespace App\Actions\Students;

use App\Models\Student;
use App\Models\StudentSkill;
use Illuminate\Support\Facades\DB;

/**
 * The student's own skill list from PUT /students/me/skills: the given skills with
 * self-rated levels. Self-rated skills not in the list are removed; skills that came
 * from a resume or an assessment stay, but their stated level can be changed.
 */
class UpdateStudentSkillsAction
{
    /**
     * @param  array<int, int>  $levelsBySkillId  skill id => level 1-5
     */
    public function execute(Student $student, array $levelsBySkillId): void
    {
        DB::transaction(function () use ($student, $levelsBySkillId): void {
            StudentSkill::query()
                ->where('student_id', $student->id)
                ->where('source', StudentSkill::SOURCE_SELF)
                ->whereNotIn('skill_id', array_keys($levelsBySkillId))
                ->delete();

            $existing = StudentSkill::query()
                ->where('student_id', $student->id)
                ->get()
                ->keyBy('skill_id');

            foreach ($levelsBySkillId as $skillId => $level) {
                if ($row = $existing->get($skillId)) {
                    $row->update(['level' => $level]);

                    continue;
                }

                StudentSkill::query()->create([
                    'institution_id' => $student->institution_id,
                    'student_id' => $student->id,
                    'skill_id' => $skillId,
                    'level' => $level,
                    'source' => StudentSkill::SOURCE_SELF,
                ]);
            }
        });

        $student->unsetRelation('studentSkills');
    }
}
