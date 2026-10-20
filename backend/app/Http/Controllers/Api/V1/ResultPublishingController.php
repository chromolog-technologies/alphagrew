<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Marks\PublishSemesterResultsAction;
use App\Actions\Marks\UnlockSemesterResultsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marks\PublishingLogsRequest;
use App\Http\Requests\Marks\SemesterResultsRequest;
use App\Http\Requests\Marks\UnlockResultsRequest;
use App\Http\Resources\ResultPublishingLogResource;
use App\Models\ResultPublishingLog;
use App\Services\Academics\PublishingReadiness;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Semester result publishing and locking (Academic Results spec §4 Stage 5).
 * A semester is published whole, only once every subject's marks are approved.
 */
class ResultPublishingController extends Controller
{
    /** GET /result-publishing/status?semesterId= — pre-flight check. */
    public function status(SemesterResultsRequest $request, PublishingReadiness $readiness): JsonResponse
    {
        return response()->json(['data' => $readiness->check($request->semester())]);
    }

    /** POST /result-publishing/publish — 422 with pendingSubjects while any subject is not approved. */
    public function publish(SemesterResultsRequest $request, PublishSemesterResultsAction $publish): JsonResponse
    {
        $log = $publish->execute($request->user(), $request->semester(), $request->ip());

        return response()->json([
            'data' => new ResultPublishingLogResource($log),
            'message' => "Results published for {$log->total_students} students.",
        ]);
    }

    /** POST /result-publishing/unlock — locked → approved, with a mandatory reason. */
    public function unlock(UnlockResultsRequest $request, UnlockSemesterResultsAction $unlock): JsonResponse
    {
        $log = $unlock->execute($request->user(), $request->semester(), $request->validated('reason'), $request->ip());

        return response()->json([
            'data' => new ResultPublishingLogResource($log),
            'message' => 'Results unlocked.',
        ]);
    }

    /** GET /result-publishing/logs?semesterId= — newest first. */
    public function logs(PublishingLogsRequest $request): AnonymousResourceCollection
    {
        $logs = ResultPublishingLog::query()
            ->with(['semester', 'publishedBy'])
            ->when($request->validated('semesterId'), fn ($query, $id) => $query->where('semester_id', $id))
            ->latest('id')
            ->paginate($request->validated('perPage') ?? 50);

        return ResultPublishingLogResource::collection($logs);
    }
}
