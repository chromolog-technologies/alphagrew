<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Classes (a course's cohort in a semester, e.g. "CSE 2023 · Sem 5 · A"). Timetables are built
 * per class, so a class with timetable entries cannot be deleted.
 */
class ClassController extends Controller
{
    private const RELATIONS = ['course:id,name,code', 'semester:id,name', 'hod:id,name'];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate(['courseId' => ['nullable', 'integer'], 'semesterId' => ['nullable', 'integer']]);

        $classes = ClassModel::query()
            ->with(self::RELATIONS)
            ->when($filters['courseId'] ?? null, fn ($q, $id) => $q->where('course_id', $id))
            ->when($filters['semesterId'] ?? null, fn ($q, $id) => $q->where('semester_id', $id))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $classes->map(fn (ClassModel $c) => $this->present($c))->all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $class = ClassModel::query()->create([...$this->validated($request), 'total_students' => 0]);
        $this->audit->record('class.created', $class, [], $class->only(['name', 'code', 'course_id', 'semester_id']));

        return response()->json(['data' => $this->present($class)], 201);
    }

    public function update(Request $request, ClassModel $class): JsonResponse
    {
        $data = $this->validated($request, $class);
        $before = $class->only(array_keys($data));
        $class->update($data);
        $this->audit->record('class.updated', $class, $before, $class->only(array_keys($data)));

        return response()->json(['data' => $this->present($class)]);
    }

    public function destroy(ClassModel $class): JsonResponse
    {
        if ($class->timetables()->exists()) {
            throw new HttpException(409, 'This class has a timetable. Remove its timetable entries first.');
        }

        $class->delete();
        $this->audit->record('class.deleted', $class, $class->only(['name', 'code']), []);

        return response()->json(['message' => 'Class deleted.']);
    }

    /** The class's students (students see their class's timetable). */
    public function students(ClassModel $class): JsonResponse
    {
        return response()->json([
            'data' => $class->students()->orderBy('name')->get(['students.id', 'name', 'registration_number', 'department_code'])
                ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'registrationNumber' => $s->registration_number, 'departmentCode' => $s->department_code])
                ->all(),
        ]);
    }

    /** Replaces the class's students with the given list. */
    public function syncStudents(Request $request, ClassModel $class): JsonResponse
    {
        $v = $request->validate([
            'studentIds' => ['present', 'array', 'max:500'],
            'studentIds.*' => ['integer', 'distinct', TenantRule::exists('students', 'id')->whereNull('deleted_at')],
        ]);

        $ids = array_map('intval', $v['studentIds']);
        $before = $class->students()->pluck('students.id')->all();
        // Attach / detach rather than sync(): students who stay keep their original assigned_from.
        $added = array_values(array_diff($ids, $before));
        $removed = array_values(array_diff($before, $ids));
        $class->students()->attach(array_fill_keys($added, ['assigned_from' => now()->toDateString()]));
        $class->students()->detach($removed);
        $class->update(['total_students' => count($ids)]);
        $this->audit->record('class.students_updated', $class, ['students' => $before], ['students' => $ids]);

        return $this->students($class);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?ClassModel $class = null): array
    {
        $presence = $class ? 'sometimes' : 'required';
        $v = $request->validate([
            'name' => [$presence, 'string', 'max:255'],
            'code' => [$presence, 'string', 'max:50', TenantRule::unique('classes', 'code')->ignore($class?->id)],
            'courseId' => [$presence, 'integer', TenantRule::exists('courses', 'id')->whereNull('deleted_at')],
            'semesterId' => [$presence, 'integer', TenantRule::exists('semesters', 'id')->whereNull('deleted_at')],
            'batch' => [$presence, 'string', 'max:50'],
            'admissionYear' => [$presence, 'integer', 'min:1990', 'max:2100'],
            'batchId' => ['sometimes', 'nullable', 'integer', TenantRule::exists('batches', 'id')],
            'hodId' => ['sometimes', 'nullable', 'integer', TenantRule::exists('users', 'id')],
        ]);

        // classes has a unique index on (course, batch, admission year): report it, not a 500.
        $course = $v['courseId'] ?? $class?->course_id;
        $batch = $v['batch'] ?? $class?->batch;
        $year = $v['admissionYear'] ?? $class?->admission_year;
        $taken = ClassModel::query()
            ->where('course_id', $course)->where('batch', $batch)->where('admission_year', $year)
            ->when($class, fn ($q) => $q->whereKeyNot($class->id))
            ->exists();
        if ($taken) {
            throw ValidationException::withMessages(['batch' => 'This course already has a class for that batch and admission year. Use a different batch name, e.g. "2023-2027 B".']);
        }

        $map = [
            'name' => 'name', 'code' => 'code', 'courseId' => 'course_id', 'semesterId' => 'semester_id',
            'batch' => 'batch', 'admissionYear' => 'admission_year', 'batchId' => 'batch_id', 'hodId' => 'hod_id',
        ];
        $data = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $v)) {
                $data[$column] = $v[$input];
            }
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function present(ClassModel $class): array
    {
        $class->loadMissing(self::RELATIONS);

        return [
            'id' => $class->id,
            'name' => $class->name,
            'code' => $class->code,
            'courseId' => $class->course_id,
            'semesterId' => $class->semester_id,
            'batch' => $class->batch,
            'batchId' => $class->batch_id,
            'admissionYear' => $class->admission_year,
            'hodId' => $class->hod_id,
            'totalStudents' => $class->total_students,
            'course' => $class->course?->only(['id', 'name', 'code']),
            'semester' => $class->semester?->only(['id', 'name']),
            'hod' => $class->hod?->only(['id', 'name']),
        ];
    }
}
