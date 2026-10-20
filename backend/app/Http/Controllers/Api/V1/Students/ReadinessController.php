<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Resources\AiRecommendationResource;
use App\Http\Resources\StudentReadinessResource;
use App\Models\AiRecommendation;
use App\Services\Ai\ReadinessCalculator;
use Illuminate\Http\JsonResponse;

/**
 * AI Interview Journey stage 13 — the student's practice recommendations and readiness score.
 */
class ReadinessController extends Controller
{
    /** GET /students/me/recommendations?status=open|done|dismissed (default open), most urgent first. */
    public function recommendations(OwnStudentRequest $request): JsonResponse
    {
        $status = in_array($request->query('status'), ['open', 'done', 'dismissed'], true) ? $request->query('status') : AiRecommendation::STATUS_OPEN;

        $recommendations = AiRecommendation::query()
            ->where('student_id', $request->student()->id)
            ->where('status', $status)
            ->orderByRaw("case priority when 'high' then 1 when 'medium' then 2 else 3 end")
            ->latest('id')
            ->get();

        return response()->json(['data' => AiRecommendationResource::collection($recommendations)]);
    }

    /** GET /students/me/readiness-score — the latest score (calculated on first visit) and its history. */
    public function readinessScore(OwnStudentRequest $request, ReadinessCalculator $readiness): JsonResponse
    {
        $student = $request->student();
        $latest = $student->readinessScores()->reorder()->latest('calculated_at')->latest('id')->first()
            ?? $readiness->record($student, 'initial');

        $history = $student->readinessScores()->reorder()->latest('calculated_at')->latest('id')->limit(20)->get()->reverse()->values();

        return response()->json(['data' => new StudentReadinessResource($latest, $history)]);
    }
}
