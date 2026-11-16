<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
