<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\HandlesCustomFields;
use App\Http\Controllers\Controller;
use App\Models\CustomFieldDefinition;
use App\Models\Subject;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class SubjectController extends Controller
{
    use HandlesCustomFields;

    private const ENTITY = CustomFieldDefinition::ENTITY_SUBJECT;

    /**
     * Get all subjects
     */
    public function index(Request $request): JsonResponse
    {
        $subjects = Subject::query()
            ->with('course.department')
            ->when($request->get('course_id'), function ($query, $courseId) {
                $query->where('course_id', $courseId);
            })
            ->when($request->get('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->get();

        return response()->json($this->customFieldService()->presentMany($subjects, self::ENTITY));
    }

    /**
     * Get a single subject
     */
    public function show(Subject $subject): JsonResponse
    {
        $subject->load('course.department');

        return response()->json($this->customFieldService()->present($subject, self::ENTITY));
    }

    /**
     * Create a new subject
     */
    public function store(Request $request): JsonResponse
    {
        [$payload, $customFields] = $this->validateWithCustomFields($request, [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', TenantRule::unique('subjects', 'code'), 'max:50'],
            'course_id' => ['required', TenantRule::exists('courses', 'id')],
            'semester_number' => ['required', 'integer', 'min:1', 'max:16'],
            'credit_hours' => ['required', 'integer', 'min:1', 'max:10'],
            'lecture_hours' => ['required', 'integer', 'min:0', 'max:50'],
            'practical_hours' => ['required', 'integer', 'min:0', 'max:50'],
            'subject_type' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_mandatory' => ['boolean'],
            'is_active' => ['boolean'],
        ], self::ENTITY, creating: true);

        $subject = DB::transaction(function () use ($payload, $customFields): Subject {
            $subject = Subject::create($payload);
            $this->customFieldService()->save($subject, self::ENTITY, $customFields);

            return $subject;
        });
        $subject->load('course.department');

        return response()->json($this->customFieldService()->present($subject, self::ENTITY), 201);
    }

    /**
     * Update a subject
     */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        [$payload, $customFields] = $this->validateWithCustomFields($request, [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', TenantRule::unique('subjects', 'code')->ignore($subject->id), 'max:50'],
            'course_id' => ['required', TenantRule::exists('courses', 'id')],
            'semester_number' => ['required', 'integer', 'min:1', 'max:16'],
            'credit_hours' => ['required', 'integer', 'min:1', 'max:10'],
            'lecture_hours' => ['required', 'integer', 'min:0', 'max:50'],
            'practical_hours' => ['required', 'integer', 'min:0', 'max:50'],
            'subject_type' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_mandatory' => ['boolean'],
            'is_active' => ['boolean'],
        ], self::ENTITY, creating: false);

        DB::transaction(function () use ($subject, $payload, $customFields): void {
            $subject->update($payload);
            $this->customFieldService()->save($subject, self::ENTITY, $customFields);
        });
        $subject->load('course.department');

        return response()->json($this->customFieldService()->present($subject, self::ENTITY));
    }

    /**
     * Delete a subject
     */
    public function destroy(Subject $subject): JsonResponse
    {
        $subject->delete();
        return response()->json(['message' => 'Subject deleted successfully']);
    }

    /**
     * Get courses for select dropdown
     */
    public function getCourses(): JsonResponse
    {
        // Courses store their length as duration_value + duration_type; duration_years is
        // derived for the dropdown (null when the course has no duration).
        $courses = Course::query()
            ->select('id', 'name', 'code', 'duration_value', 'duration_type', 'total_semesters')
            ->where('is_active', true)
            ->get()
            ->map(fn (Course $course): array => [
                'id' => $course->id,
                'name' => $course->name,
                'code' => $course->code,
                'duration_value' => $course->duration_value,
                'duration_type' => $course->duration_type,
                'duration_years' => match ($course->duration_type) {
                    'Years' => $course->duration_value,
                    'Months' => $course->duration_value !== null ? round($course->duration_value / 12, 1) : null,
                    'Weeks' => $course->duration_value !== null ? round($course->duration_value / 52, 1) : null,
                    default => null,
                },
                'total_semesters' => $course->total_semesters,
            ]);

        return response()->json($courses);
    }
}
