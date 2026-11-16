<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ListExamsRequest;
use App\Http\Requests\Exams\SaveExamRequest;
use App\Models\CustomFieldDefinition;
use App\Models\Exam;
use App\Models\ExamType;
use App\Models\MarkEntry;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\CustomFields\CustomFieldService;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Exams: listed for mark entry (marks.view), scheduled by admins (exams.*) and by exam
 * coordinators (marks.publish). Once marks have been entered against an exam, its subject and
 * semester are fixed and it cannot be deleted, because mark entries and mark schemes depend on them.
 */
class ExamController extends Controller
{
    private const RELATIONS = ['subject:id,name,code', 'examType:id,name,code', 'semester:id,name,is_active'];

    private const AUDITED = ['name', 'subject_id', 'semester_id', 'exam_type_id', 'exam_date', 'start_time', 'end_time', 'max_marks', 'status'];

    public function __construct(
        private readonly CustomFieldService $customFields,
        private readonly AuditLogger $audit,
    ) {}

    public function index(ListExamsRequest $request): JsonResponse
    {
        $exams = Exam::query()
            ->with(self::RELATIONS)
            ->withCount('markEntries')
            ->when($request->validated('semester_id'), fn ($query, $semesterId) => $query->where('semester_id', $semesterId))
            ->when($request->validated('subject_id'), fn ($query, $subjectId) => $query->where('subject_id', $subjectId))
            // Same rule as SubjectPolicy::enterMarks, so every exam listed can be opened for entry.
            ->when($request->boolean('mine'), fn ($query) => $query->whereExists(fn ($allocation) => $allocation
                ->selectRaw('1')
                ->from('subject_allocations')
                ->whereColumn('subject_allocations.subject_id', 'exams.subject_id')
                ->whereColumn('subject_allocations.semester_id', 'exams.semester_id')
                ->where('subject_allocations.faculty_id', $request->user()->id)))
            ->orderByDesc('exam_date')
            ->get(['id', 'name', 'subject_id', 'exam_type_id', 'semester_id', 'exam_date', 'start_time', 'end_time', 'duration_minutes', 'location', 'max_marks', 'exam_mode', 'status']);

        return response()->json(['data' => $this->customFields->presentMany($exams, CustomFieldDefinition::ENTITY_EXAM)]);
    }

    public function show(Exam $exam): JsonResponse
    {
        return response()->json(['data' => $this->present($exam)]);
    }

    /** Exam types are shared by all institutions (seeded); institutions pick from them. */
    public function types(): JsonResponse
    {
        return response()->json([
            'data' => ExamType::query()->orderBy('name')->get(['id', 'name', 'code', 'max_marks', 'passing_marks', 'weightage']),
        ]);
    }

    public function store(SaveExamRequest $request): JsonResponse
    {
        $this->authorizeManage($request->user(), CampusPermission::EXAMS_CREATE);

        $exam = DB::transaction(function () use ($request): Exam {
            $exam = Exam::query()->create($request->examAttributes());
            $this->customFields->save($exam, CustomFieldDefinition::ENTITY_EXAM, $request->customFields());

            return $exam;
        });
        $this->audit->record('exam.created', $exam, [], $exam->only(self::AUDITED));

        return response()->json(['data' => $this->present($exam->refresh())], 201);
    }

    public function update(SaveExamRequest $request, Exam $exam): JsonResponse
    {
        $this->authorizeManage($request->user(), CampusPermission::EXAMS_EDIT);

        $attributes = $request->examAttributes();
        $moves = array_filter(
            ['subject_id', 'semester_id'],
            fn (string $column) => array_key_exists($column, $attributes) && (int) $attributes[$column] !== (int) $exam->getAttribute($column),
        );
        if ($moves !== [] && $this->hasMarks($exam)) {
            throw new HttpException(409, 'Marks have already been entered for this exam, so its subject and semester cannot change.');
        }

        $before = $exam->only(self::AUDITED);
        DB::transaction(function () use ($request, $exam, $attributes): void {
            $exam->update($attributes);
            $this->customFields->save($exam, CustomFieldDefinition::ENTITY_EXAM, $request->customFields());
        });
        $this->audit->record('exam.updated', $exam, $before, $exam->only(self::AUDITED));

        return response()->json(['data' => $this->present($exam->refresh())]);
    }

    public function destroy(Request $request, Exam $exam): JsonResponse
    {
        $this->authorizeManage($request->user(), CampusPermission::EXAMS_DELETE);

        if ($this->hasMarks($exam)) {
            throw new HttpException(409, 'Marks have already been entered for this exam. Cancel it instead of deleting it.');
        }

        $exam->delete();
        $this->audit->record('exam.deleted', $exam, $exam->only(self::AUDITED), []);

        return response()->json(['message' => 'Exam deleted.']);
    }

    /** Admins hold exams.*; exam coordinators (marks.publish) schedule the exams they publish. */
    private function authorizeManage(User $user, string $permission): void
    {
        abort_unless($user->can($permission) || $user->can(CampusPermission::MARKS_PUBLISH), 403, 'You cannot manage exams.');
    }

    private function hasMarks(Exam $exam): bool
    {
        return MarkEntry::query()->where('exam_id', $exam->id)->exists();
    }

    /** @return array<string, mixed> */
    private function present(Exam $exam): array
    {
        $exam->load(self::RELATIONS)->loadCount('markEntries');

        return $this->customFields->present($exam, CustomFieldDefinition::ENTITY_EXAM);
    }
}
