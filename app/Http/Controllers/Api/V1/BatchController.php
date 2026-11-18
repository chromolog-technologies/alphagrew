<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Batches\AssignBatchStudentsRequest;
use App\Http\Requests\Batches\SaveBatchRequest;
use App\Http\Resources\BatchResource;
use App\Models\Batch;
use App\Models\Student;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Batches (admission cohorts) and which students belong to them (PRD §6, plan S2-1).
 */
class BatchController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(Batch::STATUSES)],
            'departmentCode' => ['nullable', 'string', 'max:20'],
        ]);

        $batches = Batch::query()
            ->with('course:id,name')
            ->withCount('students')
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['departmentCode'] ?? null, fn ($query, string $code) => $query->where('department_code', strtoupper($code)))
            ->orderByDesc('admission_year')
            ->orderBy('code')
            ->get();

        return BatchResource::collection($batches);
    }

    public function store(SaveBatchRequest $request): JsonResponse
    {
        $batch = Batch::query()->create(['status' => 'active', ...$request->attributesForModel()]);
        $this->audit->record('batch.created', $batch, [], $batch->only(['code', 'name', 'admission_year', 'graduation_year']));

        return (new BatchResource($batch->loadCount('students')))->response()->setStatusCode(201);
    }

    public function update(SaveBatchRequest $request, Batch $batch): BatchResource
    {
        $before = $batch->only(['code', 'name', 'department_code', 'admission_year', 'graduation_year', 'status']);
        $batch->update($request->attributesForModel());
        $this->audit->record('batch.updated', $batch, $before, $batch->only(array_keys($before)));

        return new BatchResource($batch->loadCount('students'));
    }

    public function destroy(Batch $batch): JsonResponse
    {
        if ($batch->students()->exists()) {
            throw BusinessRuleException::conflict('Move the students to another batch before deleting this one.');
        }

        $batch->delete();
        $this->audit->record('batch.deleted', $batch, $batch->only(['code', 'name']));

        return response()->json(['message' => 'Batch deleted.']);
    }

    /**
     * Puts students into this batch. Students of another department are refused when the
     * batch belongs to a department.
     */
    public function assignStudents(AssignBatchStudentsRequest $request, Batch $batch): JsonResponse
    {
        $students = Student::query()->whereKey($request->validated('studentIds'))->get(['id', 'name', 'department_code', 'batch_id']);

        if ($batch->department_code) {
            $mismatched = $students->filter(fn (Student $student): bool => $student->department_code !== $batch->department_code);
            if ($mismatched->isNotEmpty()) {
                throw BusinessRuleException::unprocessable(
                    "These students are not in {$batch->department_code}: ".$mismatched->pluck('name')->implode(', ').'.',
                    ['studentIds' => $mismatched->pluck('id')->values()],
                );
            }
        }

        Student::query()->whereKey($students->modelKeys())->update(['batch_id' => $batch->id]);
        $this->audit->record('batch.students_assigned', $batch, [], ['studentIds' => $students->modelKeys()]);

        return response()->json([
            'message' => sprintf('%d student(s) added to %s.', $students->count(), $batch->code),
            'data' => new BatchResource($batch->loadCount('students')),
        ]);
    }

    public function removeStudents(AssignBatchStudentsRequest $request, Batch $batch): JsonResponse
    {
        $removed = Student::query()
            ->whereKey($request->validated('studentIds'))
            ->where('batch_id', $batch->id)
            ->update(['batch_id' => null]);
        $this->audit->record('batch.students_removed', $batch, [], ['studentIds' => $request->validated('studentIds')]);

        return response()->json([
            'message' => "{$removed} student(s) removed from {$batch->code}.",
            'data' => new BatchResource($batch->loadCount('students')),
        ]);
    }
}
