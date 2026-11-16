<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesCustomFields;
use App\Models\Course;
use App\Models\CustomFieldDefinition;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;
use Illuminate\Support\Facades\DB;

class CourseController extends Controller
{
    use HandlesCustomFields;

    private const ENTITY = CustomFieldDefinition::ENTITY_COURSE;

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

        return response()->json($this->customFieldService()->presentMany($courses, self::ENTITY));
    }

    /**
     * Get a single course with subjects
     */
    public function show(Course $course): JsonResponse
    {
        $course->load('department', 'subjects');

        return response()->json($this->customFieldService()->present($course, self::ENTITY));
    }

    /**
     * Create a new course
     */
    public function store(Request $request): JsonResponse
    {
        [$payload, $customFields] = $this->validateWithCustomFields($request, [
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
        ], self::ENTITY, creating: true);

        // courses.duration_years is NOT NULL in installs created by the first courses migration,
        // and the form does not send it.
        $payload['duration_years'] = $this->durationYears($payload);

        $course = DB::transaction(function () use ($payload, $customFields): Course {
            $course = Course::create($payload);
            $this->customFieldService()->save($course, self::ENTITY, $customFields);

            return $course;
        });
        $course->load('department');

        return response()->json($this->customFieldService()->present($course, self::ENTITY), 201);
    }

    /**
     * Update a course
     */
    public function update(Request $request, Course $course): JsonResponse
    {
        [$payload, $customFields] = $this->validateWithCustomFields($request, [
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
        ], self::ENTITY, creating: false);

        $payload['duration_years'] = $this->durationYears($payload);

        DB::transaction(function () use ($course, $payload, $customFields): void {
            $course->update($payload);
            $this->customFieldService()->save($course, self::ENTITY, $customFields);
        });
        $course->load('department');

        return response()->json($this->customFieldService()->present($course, self::ENTITY));
    }

    /**
     * Course length in whole years: the duration when it is given in years (or months),
     * otherwise two semesters per year.
     *
     * @param  array<string, mixed>  $payload
     */
    private function durationYears(array $payload): int
    {
        $value = isset($payload['duration_value']) ? (int) $payload['duration_value'] : null;

        return match (true) {
            $value !== null && ($payload['duration_type'] ?? 'Years') === 'Years' => $value,
            $value !== null && ($payload['duration_type'] ?? null) === 'Months' => max(1, (int) ceil($value / 12)),
            default => max(1, (int) ceil(((int) $payload['total_semesters']) / 2)),
        };
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
            ->get();

        return response()->json($staff);
    }
}
