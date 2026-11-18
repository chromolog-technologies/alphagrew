<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Students\UpdateStudentResumeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\UpdateStudentResumeRequest;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;

class StudentResumeController extends Controller
{
    /**
     * PUT /students/me/resume — the signed-in student's own resume profile.
     */
    public function update(
        UpdateStudentResumeRequest $request,
        UpdateStudentResumeAction $updateResume,
        CampusDataService $campusData,
    ): JsonResponse {
        $user = $request->user();

        $updateResume->execute($user->student, $request->validated());

        return response()->json([
            'data' => $campusData->buildForUser($user->fresh(['student:id,user_id'])),
        ]);
    }
}
