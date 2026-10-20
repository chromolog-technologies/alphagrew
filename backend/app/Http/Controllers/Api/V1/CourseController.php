<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class CourseController extends Controller
{
    /**
     * Get all courses
     */
    public function index(Request $request): JsonResponse
    {
        $courses = Course::query()
            ->with('department')
            ->when($request->get('department_id'), function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->get('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->get();

        return response()->json($courses);
    }

    /**
     * Get a single course with subjects
     */
    public function show(Course $course): JsonResponse
    {
        $course->load('department', 'subjects');
        return response()->json($course);
    }

    /**
     * Create a new course
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', TenantRule::unique('courses', 'code'), 'max:50'],
            'department_id' => ['required', TenantRule::exists('departments', 'id')],
            'course_type' => ['nullable', 'in:UG,PG,Diploma,Certification'],
            'stream' => ['nullable', 'in:Science,Commerce,Arts,Engineering,Management,Other'],
            'mode' => ['nullable', 'in:Full-Time,Part-Time,Distance,Hybrid'],
            'academic_level' => ['nullable', 'in:Undergraduate,Postgraduate,Diploma,Certificate'],
            'duration_value' => ['nullable', 'integer', 'min:1', 'max:10'],
            'duration_type' => ['nullable', 'in:Years,Months,Weeks'],
            'total_semesters' => ['required', 'integer', 'min:1', 'max:16'],
            'total_credits' => ['nullable', 'integer', 'min:1'],
            'description' => ['nullable', 'string'],
            'intake_capacity' => ['nullable', 'integer', 'min:1'],
            'eligibility' => ['nullable', 'string'],
            'min_qualification' => ['nullable', 'string', 'max:255'],
            'entrance_required' => ['boolean'],
            'course_coordinator_id' => ['nullable', TenantRule::exists('users', 'id')],
            'total_fees' => ['nullable', 'numeric', 'min:0'],
            'fees_per_semester' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $course = Course::create($payload);
        $course->load('department');

        return response()->json($course, 201);
    }

    /**
     * Update a course
     */
    public function update(Request $request, Course $course): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', TenantRule::unique('courses', 'code')->ignore($course->id), 'max:50'],
            'department_id' => ['required', TenantRule::exists('departments', 'id')],
            'course_type' => ['nullable', 'in:UG,PG,Diploma,Certification'],
            'stream' => ['nullable', 'in:Science,Commerce,Arts,Engineering,Management,Other'],
            'mode' => ['nullable', 'in:Full-Time,Part-Time,Distance,Hybrid'],
            'academic_level' => ['nullable', 'in:Undergraduate,Postgraduate,Diploma,Certificate'],
            'duration_value' => ['nullable', 'integer', 'min:1', 'max:10'],
            'duration_type' => ['nullable', 'in:Years,Months,Weeks'],
            'total_semesters' => ['required', 'integer', 'min:1', 'max:16'],
            'total_credits' => ['nullable', 'integer', 'min:1'],
            'description' => ['nullable', 'string'],
            'intake_capacity' => ['nullable', 'integer', 'min:1'],
            'eligibility' => ['nullable', 'string'],
            'min_qualification' => ['nullable', 'string', 'max:255'],
            'entrance_required' => ['boolean'],
            'course_coordinator_id' => ['nullable', TenantRule::exists('users', 'id')],
            'total_fees' => ['nullable', 'numeric', 'min:0'],
            'fees_per_semester' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $course->update($payload);
        $course->load('department');

        return response()->json($course);
    }

    /**
     * Delete a course
     */
    public function destroy(Course $course): JsonResponse
    {
        $course->delete();
        return response()->json(['message' => 'Course deleted successfully']);
    }

    /**
     * Get departments for select dropdown
     */
    public function getDepartments(): JsonResponse
    {
        $departments = Department::query()
            ->select('id', 'name', 'code')
            ->get();

        return response()->json($departments);
    }

    /**
     * Get courses for select dropdown
     */
    public function getCoursesForSelect(): JsonResponse
    {
        $courses = Course::query()
            ->select('id', 'name', 'code', 'duration_value', 'duration_type', 'total_semesters')
            ->where('is_active', true)
            ->get();

        return response()->json($courses);
    }

    /**
     * Get staff for course coordinator dropdown
     */
    public function getStaffForCoordinator(): JsonResponse
    {
        $staff = User::query()
            ->select('id', 'name', 'email')
            ->where('role', 'staff')
            ->orWhere('role', 'hod')
            ->get();

        return response()->json($staff);
    }
}
