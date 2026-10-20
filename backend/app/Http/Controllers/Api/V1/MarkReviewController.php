<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Marks\ApproveMarkEntriesAction;
use App\Actions\Marks\RejectMarkEntryAction;
use App\Actions\Marks\VerifyMarkEntryAction;
use App\Enums\MarkStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marks\BulkApproveMarksRequest;
use App\Http\Requests\Marks\ExamSummaryRequest;
use App\Http\Requests\Marks\MarkEntryFiltersRequest;
use App\Http\Requests\Marks\RejectMarkEntryRequest;
use App\Http\Requests\Marks\ReviewMarkEntryRequest;
use App\Http\Requests\Marks\VerifyMarkEntryRequest;
use App\Http\Resources\MarkEntryResource;
use App\Models\MarkEntry;
use App\Repositories\MarkEntryRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Departmental review of submitted marks: verify (with moderation), approve, reject
 * (Academic Results spec §4 Stage 4). Reviewers see and act on their own department's
 * subjects; Exam Coordinators on the whole institution.
 */
class MarkReviewController extends Controller
{
    public function __construct(private readonly MarkEntryRepository $marks)
    {
    }

    /** GET /mark-review/get-submitted-marks — awaiting review (submitted + verified) unless a status is given. */
    public function queue(MarkEntryFiltersRequest $request): AnonymousResourceCollection
    {
        $filtered = fn () => $this->marks->visibleTo($request->user())
            ->when($request->validated('examId'), fn ($query, $id) => $query->where('exam_id', $id))
            ->when($request->validated('subjectId'), fn ($query, $id) => $query->where('subject_id', $id));

        $entries = $filtered()
            ->with(['exam', 'subject', 'student'])
            ->whereIn('status', (array) ($request->validated('status') ?? [MarkStatus::Submitted->value, MarkStatus::Verified->value]))
            ->orderBy('subject_id')
            ->orderBy('student_id')
            ->paginate($request->validated('perPage') ?? 50);

        $byStatus = $filtered()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return MarkEntryResource::collection($entries)->additional([
            'stats' => collect(MarkStatus::cases())->mapWithKeys(fn (MarkStatus $status) => [$status->value => (int) ($byStatus[$status->value] ?? 0)]),
        ]);
    }

    /** GET /mark-review/exam-summary?examId=&subjectId= — class statistics and grade distribution. */
    public function examSummary(ExamSummaryRequest $request): JsonResponse
    {
        $exam = $request->exam();
        $subject = $request->subject();
        $entries = $this->marks->visibleTo($request->user())
            ->where('exam_id', $exam->id)
            ->where('subject_id', $subject->id)
            ->get();
        $present = $entries->where('is_absent', false);

        return response()->json([
            'data' => [
                'exam' => ['id' => $exam->id, 'name' => $exam->name],
                'subject' => ['id' => $subject->id, 'code' => $subject->code, 'name' => $subject->name],
                'totalStudents' => $entries->count(),
                'absentCount' => $entries->count() - $present->count(),
                'passCount' => $entries->where('result', MarkEntry::RESULT_PASS)->count(),
                'failCount' => $entries->where('result', MarkEntry::RESULT_FAIL)->count(),
                'averageMarks' => $present->isEmpty() ? null : round($present->avg('total_marks'), 2),
                'highestMarks' => $present->max('total_marks'),
                'lowestMarks' => $present->min('total_marks'),
                'gradeDistribution' => $entries->countBy('grade'),
                'statusDistribution' => $entries->countBy(fn (MarkEntry $entry) => $entry->status->value),
            ],
        ]);
    }

    /** POST /mark-review/{markEntry}/verify */
    public function verify(VerifyMarkEntryRequest $request, MarkEntry $markEntry, VerifyMarkEntryAction $verify): MarkEntryResource
    {
        $entry = $verify->execute($request->user(), $markEntry, $request->validated('remarks'), $request->adjustments());

        return new MarkEntryResource($entry->load(['exam', 'subject', 'student']));
    }

    /** POST /mark-review/{markEntry}/approve */
    public function approve(ReviewMarkEntryRequest $request, MarkEntry $markEntry, ApproveMarkEntriesAction $approve): MarkEntryResource
    {
        $entry = $approve->approve($request->user(), $markEntry);

        return new MarkEntryResource($entry->load(['exam', 'subject', 'student']));
    }

    /** POST /mark-review/{markEntry}/reject — back to draft; the faculty is notified. */
    public function reject(RejectMarkEntryRequest $request, MarkEntry $markEntry, RejectMarkEntryAction $reject): MarkEntryResource
    {
        $entry = $reject->execute($request->user(), $markEntry, $request->validated('remarks'));

        return new MarkEntryResource($entry->load(['exam', 'subject', 'student']));
    }

    /** POST /mark-review/bulk-approve — every verified entry of the subject (and exam, if given). */
    public function bulkApprove(BulkApproveMarksRequest $request, ApproveMarkEntriesAction $approve): JsonResponse
    {
        $entries = MarkEntry::query()
            ->where('subject_id', $request->subject()->id)
            ->when($request->exam(), fn ($query, $exam) => $query->where('exam_id', $exam->id))
            ->get();

        return response()->json([
            'data' => ['approvedCount' => $approve->approveVerified($request->user(), $entries)],
            'message' => 'Verified marks approved.',
        ]);
    }
}
