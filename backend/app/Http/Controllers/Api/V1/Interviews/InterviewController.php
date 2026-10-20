<?php

namespace App\Http\Controllers\Api\V1\Interviews;

use App\Actions\Interviews\AnswerTurnAction;
use App\Actions\Interviews\CreateInterviewAction;
use App\Actions\Interviews\FinishInterviewAction;
use App\Actions\Interviews\StartInterviewAction;
use App\Enums\InterviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interviews\AnswerTurnRequest;
use App\Http\Requests\Interviews\FinishInterviewRequest;
use App\Http\Requests\Interviews\OwnInterviewRequest;
use App\Http\Requests\Interviews\StartInterviewRequest;
use App\Http\Requests\Students\Me\CreateInterviewRequest;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Resources\InterviewDetailResource;
use App\Http\Resources\InterviewEvaluationResource;
use App\Http\Resources\InterviewSessionResource;
use App\Http\Resources\SkillGapReportResource;
use App\Http\Resources\TurnResource;
use App\Models\AiInterview;
use App\Models\AiInterviewTurn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * AI Interview Journey phases B and C — interview sessions (spec §3, §5).
 */
class InterviewController extends Controller
{
    /** POST /students/me/interviews — stages 4–5: configure and plan; 201 with status "planned". */
    public function store(CreateInterviewRequest $request, CreateInterviewAction $create): JsonResponse
    {
        $interview = $create->execute($request->student(), $request->toData());

        return response()->json(['data' => new InterviewSessionResource($interview)], 201);
    }

    /** GET /students/me/interviews?status=&page= — the student's sessions, newest first. */
    public function history(OwnStudentRequest $request): AnonymousResourceCollection
    {
        $status = InterviewStatus::tryFrom((string) $request->query('status'));

        $interviews = $request->student()->interviews()
            ->with('evaluation:id,interview_id,overall_score')
            ->when($status, fn ($query) => $query->where('status', $status->value))
            ->latest('id')
            ->paginate(min(100, max(1, $request->integer('perPage', 15))));

        return InterviewSessionResource::collection($interviews);
    }

    /** GET /interviews/{interview} — session state and every turn. */
    public function show(OwnInterviewRequest $request, AiInterview $interview): JsonResponse
    {
        return response()->json(['data' => new InterviewDetailResource($interview->load(['turns', 'evaluation']))]);
    }

    /** POST /interviews/{interview}/start — consent, then the first question. */
    public function start(StartInterviewRequest $request, AiInterview $interview, StartInterviewAction $start): JsonResponse
    {
        return response()->json(['data' => ['firstTurn' => new TurnResource($start->execute($interview))]]);
    }

    /** POST /interviews/{interview}/turns/{turn}/answer — the next turn, or null when complete. */
    public function answer(AnswerTurnRequest $request, AiInterview $interview, AiInterviewTurn $turn, AnswerTurnAction $answer): JsonResponse
    {
        ['nextTurn' => $next, 'isCompleted' => $completed] = $answer->execute($interview, $turn, $request->validated('answerText'), $request->file('audio'));

        return response()->json(['data' => [
            'nextTurn' => $next ? new TurnResource($next) : null,
            'isCompleted' => $completed,
        ]]);
    }

    /** POST /interviews/{interview}/finish — 202 while the evaluation is queued. */
    public function finish(FinishInterviewRequest $request, AiInterview $interview, FinishInterviewAction $finish): JsonResponse
    {
        $finish->execute($interview, $request->validated('reason') ?? 'user_ended');

        return response()->json(['data' => ['status' => $interview->status->value]], 202);
    }

    /** GET /interviews/{interview}/evaluation — 404 until evaluated. */
    public function evaluation(OwnInterviewRequest $request, AiInterview $interview): JsonResponse
    {
        $evaluation = $interview->evaluation ?? abort(404, 'This interview has not been evaluated yet.');

        return response()->json(['data' => new InterviewEvaluationResource($evaluation)]);
    }

    /** GET /interviews/{interview}/skill-gap — 404 until generated. */
    public function skillGap(OwnInterviewRequest $request, AiInterview $interview): JsonResponse
    {
        $report = $interview->skillGapReport ?? abort(404, 'The skill gap report is not ready yet.');

        return response()->json(['data' => new SkillGapReportResource($report)]);
    }
}
