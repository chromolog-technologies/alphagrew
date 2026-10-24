<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Marks\SaveDraftMarksAction;
use App\Actions\Marks\SubmitMarksAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marks\MarkEntryFiltersRequest;
use App\Http\Requests\Marks\MarkRosterRequest;
use App\Http\Requests\Marks\SaveDraftMarksRequest;
use App\Http\Requests\Marks\SubmitMarksRequest;
use App\Http\Resources\MarkEntryResource;
use App\Http\Resources\MarkSchemeResource;
use App\Models\MarkEntry;
use App\Models\Student;
use App\Repositories\MarkEntryRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Faculty mark entry: class roster, draft saving and submission for review
 * (Academic Results spec §4 Stages 2–3).
 */
class MarkEntryController extends Controller
{
    public function __construct(private readonly MarkEntryRepository $marks)
    {
    }

    /** GET /mark-entries?examId=&subjectId=&status= */
    public function index(MarkEntryFiltersRequest $request): AnonymousResourceCollection
    {
        $entries = $this->marks->visibleTo($request->user())
            ->with(['exam', 'subject', 'student'])
            ->when($request->validated('examId'), fn ($query, $id) => $query->where('exam_id', $id))
            ->when($request->validated('subjectId'), fn ($query, $id) => $query->where('subject_id', $id))
            ->when($request->validated('status'), fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('updated_at')
            ->paginate($request->validated('perPage') ?? 50);

        return MarkEntryResource::collection($entries);
    }

    /** GET /mark-entries/{markEntry} */
    public function show(MarkEntryFiltersRequest $request, MarkEntry $markEntry): MarkEntryResource
    {
        $entry = $this->marks->visibleTo($request->user())->findOrFail($markEntry->id);

        return new MarkEntryResource($entry->load(['exam', 'subject', 'student']));
    }

    /**
     * GET /mark-entries/get-students?examId=&subjectId= — the class roster with any marks
     * already entered. Students with marks but outside the roster (e.g. re-appearing) are included.
     */
    public function students(MarkRosterRequest $request): JsonResponse
    {
        $exam = $request->exam();
        $subject = $request->subject();

        $entries = MarkEntry::query()
            ->with('student')
            ->where('exam_id', $exam->id)
            ->where('subject_id', $subject->id)
            ->get()
            ->keyBy('student_id');

        $students = $this->marks->rosterFor($subject)
            ->concat($entries->pluck('student')->filter())
            ->unique('id')
            ->sortBy('registration_number')
            ->values();

        return response()->json([
            'data' => [
                'exam' => ['id' => $exam->id, 'name' => $exam->name, 'semesterId' => $exam->semester_id],
                'subject' => ['id' => $subject->id, 'code' => $subject->code, 'name' => $subject->name, 'credits' => $subject->credits()],
                'markScheme' => new MarkSchemeResource($request->scheme()),
                'students' => $students->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'registrationNumber' => $student->registration_number,
                    'entry' => $entries->has($student->id) ? new MarkEntryResource($entries->get($student->id)) : null,
                ]),
            ],
        ]);
    }

    /** POST /mark-entries/save-draft */
    public function saveDraft(SaveDraftMarksRequest $request, SaveDraftMarksAction $save): JsonResponse
    {
        $entries = $save->execute($request->user(), $request->exam(), $request->subject(), $request->scheme(), $request->rows());

        return response()->json([
            'data' => [
                'savedCount' => $entries->count(),
                'entries' => MarkEntryResource::collection($entries),
            ],
            'message' => 'Marks saved as draft.',
        ]);
    }

    /** POST /mark-entries/submit — draft → submitted; read-only to the faculty from here. */
    public function submit(SubmitMarksRequest $request, SubmitMarksAction $submit): JsonResponse
    {
        $count = $submit->execute($request->user(), $request->exam(), $request->subject(), $request->scheme());

        return response()->json([
            'data' => ['submittedCount' => $count],
            'message' => 'Marks submitted for review.',
        ]);
    }
}
