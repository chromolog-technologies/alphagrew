<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\SubjectAllocation;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Which faculty member teaches which subject in which semester. Mark entry is allowed only for
 * allocated faculty (SubjectPolicy::enterMarks), so this is what unlocks Marks → Enter Marks.
 */
class SubjectAllocationController extends Controller
{
    private const FACULTY_ROLES = [UserRole::Staff->value, UserRole::PlacementOfficer->value];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'subjectId' => ['nullable', 'integer'],
            'semesterId' => ['nullable', 'integer'],
            'facultyId' => ['nullable', 'integer'],
        ]);

        $allocations = SubjectAllocation::query()
            ->with(['subject:id,name,code', 'semester:id,name', 'faculty:id,name,email'])
            ->when($filters['subjectId'] ?? null, fn ($q, $id) => $q->where('subject_id', $id))
            ->when($filters['semesterId'] ?? null, fn ($q, $id) => $q->where('semester_id', $id))
            ->when($filters['facultyId'] ?? null, fn ($q, $id) => $q->where('faculty_id', $id))
            ->orderBy('subject_id')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $allocations->map(fn (SubjectAllocation $a) => $this->present($a))->all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'subjectId' => ['required', 'integer', TenantRule::exists('subjects', 'id')->whereNull('deleted_at')],
            'semesterId' => ['required', 'integer', TenantRule::exists('semesters', 'id')->whereNull('deleted_at')],
            'facultyId' => ['required', 'integer', TenantRule::exists('users', 'id')->whereIn('role', self::FACULTY_ROLES)->whereNull('deleted_at')],
            'allocatedFrom' => ['nullable', 'date'],
            'allocatedTo' => ['nullable', 'date', 'after_or_equal:allocatedFrom'],
        ], ['facultyId.exists' => 'Choose a staff member of this institution.']);

        $duplicate = SubjectAllocation::query()
            ->where('subject_id', $v['subjectId'])->where('semester_id', $v['semesterId'])->where('faculty_id', $v['facultyId'])
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages(['facultyId' => 'This staff member already teaches the subject in that semester.']);
        }

        $allocation = SubjectAllocation::query()->create([
            'subject_id' => $v['subjectId'],
            'semester_id' => $v['semesterId'],
            'faculty_id' => $v['facultyId'],
            'allocated_from' => $v['allocatedFrom'] ?? now()->toDateString(),
            'allocated_to' => $v['allocatedTo'] ?? null,
        ]);
        $this->audit->record('subject_allocation.created', $allocation, [], $allocation->only(['subject_id', 'semester_id', 'faculty_id']));

        return response()->json(['data' => $this->present($allocation)], 201);
    }

    public function update(Request $request, SubjectAllocation $subjectAllocation): JsonResponse
    {
        $v = $request->validate([
            'allocatedFrom' => ['sometimes', 'date'],
            'allocatedTo' => ['sometimes', 'nullable', 'date'],
        ]);

        $from = $v['allocatedFrom'] ?? $subjectAllocation->allocated_from;
        $to = array_key_exists('allocatedTo', $v) ? $v['allocatedTo'] : $subjectAllocation->allocated_to;
        if ($to !== null && strtotime((string) $to) < strtotime((string) $from)) {
            throw ValidationException::withMessages(['allocatedTo' => 'The end date cannot be before the start date.']);
        }

        $before = $subjectAllocation->only(['allocated_from', 'allocated_to']);
        $subjectAllocation->update(['allocated_from' => $from, 'allocated_to' => $to]);
        $this->audit->record('subject_allocation.updated', $subjectAllocation, $before, $subjectAllocation->only(['allocated_from', 'allocated_to']));

        return response()->json(['data' => $this->present($subjectAllocation)]);
    }

    /** Ends the allocation: the faculty member can no longer enter marks for the subject. Entered marks stay. */
    public function destroy(SubjectAllocation $subjectAllocation): JsonResponse
    {
        $subjectAllocation->delete();
        $this->audit->record('subject_allocation.deleted', $subjectAllocation, $subjectAllocation->only(['subject_id', 'semester_id', 'faculty_id']), []);

        return response()->json(['message' => 'Allocation removed.']);
    }

    /** @return array<string, mixed> */
    private function present(SubjectAllocation $a): array
    {
        $a->loadMissing(['subject:id,name,code', 'semester:id,name', 'faculty:id,name,email']);

        return [
            'id' => $a->id,
            'subjectId' => $a->subject_id,
            'semesterId' => $a->semester_id,
            'facultyId' => $a->faculty_id,
            'allocatedFrom' => $a->allocated_from ? substr((string) $a->allocated_from, 0, 10) : null,
            'allocatedTo' => $a->allocated_to ? substr((string) $a->allocated_to, 0, 10) : null,
            'subject' => $a->subject?->only(['id', 'name', 'code']),
            'semester' => $a->semester?->only(['id', 'name']),
            'faculty' => $a->faculty?->only(['id', 'name', 'email']),
        ];
    }
}
