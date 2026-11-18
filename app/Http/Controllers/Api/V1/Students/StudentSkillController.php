<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Actions\Students\UpdateStudentSkillsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\UpdateStudentSkillsRequest;
use App\Http\Resources\StudentSkillResource;
use App\Models\Skill;
use App\Models\Student;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Student Journey step 6: the student's own skills with levels.
 */
class StudentSkillController extends Controller
{
    public function __construct(private readonly ProfileCompleteness $completeness)
    {
    }

    /** GET /students/me/skills */
    public function index(OwnStudentRequest $request): JsonResponse
    {
        return $this->skillsResponse($request->student());
    }

    /** PUT /students/me/skills — the full self-rated list; resume/assessment skills are kept. */
    public function update(UpdateStudentSkillsRequest $request, UpdateStudentSkillsAction $updateSkills): JsonResponse
    {
        $student = $request->student();

        $updateSkills->execute($student, $request->levelsBySkillId());
        $this->completeness->refresh($student);

        return $this->skillsResponse($student);
    }

    /** DELETE /students/me/skills/{skill} */
    public function destroy(OwnStudentRequest $request, Skill $skill): Response
    {
        $student = $request->student();

        $deleted = $student->studentSkills()->where('skill_id', $skill->id)->delete();
        abort_if($deleted === 0, 404);

        $this->completeness->refresh($student);

        return response()->noContent();
    }

    private function skillsResponse(Student $student): JsonResponse
    {
        $skills = $student->studentSkills()->with('skill')->get()->sortBy('skill.name')->values();

        return response()->json(['data' => StudentSkillResource::collection($skills)]);
    }
}
