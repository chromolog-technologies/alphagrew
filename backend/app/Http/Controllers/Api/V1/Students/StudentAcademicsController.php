<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\SaveEducationRequest;
use App\Http\Requests\Students\VerifyEducationRequest;
use App\Http\Resources\AcademicSummaryResource;
use App\Http\Resources\EducationRecordResource;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Student Journey step 3: prior education (student-entered, staff-verified) and the
 * academic summary derived from published results (read-only).
 */
class StudentAcademicsController extends Controller
{
    public function __construct(private readonly RecalculateAcademicSummaryAction $recalculate)
    {
    }

    /** GET /students/me/academics */
    public function show(OwnStudentRequest $request): JsonResponse
    {
        return $this->academicsResponse($request->student());
    }

    /** POST /students/me/education */
    public function storeEducation(SaveEducationRequest $request): JsonResponse
    {
        $record = $request->student()->education()->create($request->attributesForModel());

        return response()->json(['data' => new EducationRecordResource($record)], 201);
    }

    /** PUT /students/me/education/{education} — clears any verification. */
    public function updateEducation(SaveEducationRequest $request): JsonResponse
    {
        $record = $request->ownRecord('education');
        $record->update($request->attributesForModel());

        return response()->json(['data' => new EducationRecordResource($record)]);
    }

    /** DELETE /students/me/education/{education} */
    public function destroyEducation(OwnStudentRequest $request): Response
    {
        $request->ownRecord('education')->delete();

        return response()->noContent();
    }

    /** GET /students/{student}/academics */
    public function showForStaff(Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return $this->academicsResponse($student);
    }

    /**
     * GET /students/{student}/academic-summary — CGPA and backlogs derived from published
     * results, for placement eligibility (results.view_summary).
     */
    public function summary(Student $student): JsonResponse
    {
        // A JSON response, not the resource: a summary created on first read would otherwise answer 201.
        return response()->json(['data' => new AcademicSummaryResource($student->academicSummary ?? $this->recalculate->execute($student))]);
    }

    /** POST /students/{student}/education/{education}/verify */
    public function verify(VerifyEducationRequest $request): JsonResponse
    {
        $record = $request->educationRecord();
        $verified = $request->boolean('verified');

        $record->update([
            'verified_by' => $verified ? $request->user()->id : null,
            'verified_at' => $verified ? now() : null,
            'verification_remarks' => $request->validated('remarks'),
        ]);

        return response()->json(['data' => new EducationRecordResource($record)]);
    }

    /** POST /students/{student}/academics/recalculate — on demand, e.g. after a data fix. */
    public function recalculate(Student $student): JsonResponse
    {
        $this->authorize('manage', $student);

        $this->recalculate->execute($student);

        return $this->academicsResponse($student);
    }

    private function academicsResponse(Student $student): JsonResponse
    {
        $summary = $student->academicSummary ?? $this->recalculate->execute($student);

        return response()->json([
            'data' => [
                'summary' => new AcademicSummaryResource($summary),
                'education' => EducationRecordResource::collection(
                    $student->education()->orderByRaw($this->levelOrder())->get()
                ),
            ],
        ]);
    }

    /** class_10, class_12, diploma, ug, pg — chronological rather than alphabetical. */
    private function levelOrder(): string
    {
        return "case level when 'class_10' then 1 when 'class_12' then 2 when 'diploma' then 3 when 'ug' then 4 else 5 end";
    }
}
