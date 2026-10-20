<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class SubjectController extends Controller
{
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

        return response()->json($subjects);
    }

    /**
     * Get a single subject
     */
    public function show(Subject $subject): JsonResponse
    {
        $subject->load('course.department');
        return response()->json($subject);
    }

    /**
     * Create a new subject
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
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
        ]);

        $subject = Subject::create($payload);
        $subject->load('course.department');

        return response()->json($subject, 201);
    }

    /**
     * Update a subject
     */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        $payload = $request->validate([
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
        ]);

        $subject->update($payload);
        $subject->load('course.department');

        return response()->json($subject);
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
        $courses = Course::query()
            ->select('id', 'name', 'code', 'duration_years', 'total_semesters')
            ->where('is_active', true)
            ->get();

        return response()->json($courses);
    }
}
