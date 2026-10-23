<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ListExamsRequest;
use App\Models\Exam;
use Illuminate\Http\JsonResponse;

/**
 * Read-only exam list for picking the exam marks are entered against. Creating and
 * scheduling exams (and exam types) is still to be built (Campus Academics addendum, A9).
 */
class ExamController extends Controller
{
    public function index(ListExamsRequest $request): JsonResponse
    {
        $exams = Exam::query()
            ->with(['subject:id,name,code', 'examType:id,name'])
            ->when($request->validated('semester_id'), fn ($query, $semesterId) => $query->where('semester_id', $semesterId))
            ->when($request->validated('subject_id'), fn ($query, $subjectId) => $query->where('subject_id', $subjectId))
            ->orderByDesc('exam_date')
            ->get(['id', 'name', 'subject_id', 'exam_type_id', 'semester_id', 'exam_date', 'max_marks', 'status']);

        return response()->json(['data' => $exams]);
    }
}
