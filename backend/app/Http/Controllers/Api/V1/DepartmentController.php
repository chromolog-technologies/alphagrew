<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class DepartmentController extends Controller
{
    /**
     * Get all departments with HOD and staff count
     */
    public function index(Request $request): JsonResponse
    {
        $query = Department::with(['hod:id,first_name,last_name,email']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by name or code
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $departments = $query->paginate($request->per_page ?? 50);

        // Add calculated staff count
        foreach ($departments as $dept) {
            $dept->staff_count = $dept->staff()->count();
        }

        return response()->json($departments);
    }

    /**
     * Get single department
     */
    public function show(Department $department): JsonResponse
    {
        $department->load(['hod:id,first_name,last_name,email']);
        $department->staff_count = $department->staff()->count();
        $department->student_count = $department->students()->count();
        $department->courses_count = $department->courses()->count();

        return response()->json([
            'data' => $department,
        ]);
    }

    /**
     * Create new department
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:departments,code',
            'description' => 'nullable|string|max:1000',
            'hod_id' => 'nullable|integer|exists:users,id',
            'contact_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'intake_capacity' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        $department = Department::create($validated);
        $department->load('hod:id,first_name,last_name,email');

        return response()->json([
            'message' => 'Department created successfully',
            'data' => $department,
        ], 201);
    }

    /**
     * Update department
     */
    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => [
                'sometimes',
                'string',
                'max:50',
                TenantRule::unique('departments', 'code')->ignore($department->id),
            ],
            'description' => 'nullable|string|max:1000',
            'hod_id' => 'nullable|integer|exists:users,id',
            'contact_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'intake_capacity' => 'nullable|integer|min:0',
            'status' => 'nullable|in:active,inactive',
        ]);

        $department->update($validated);
        $department->load('hod:id,first_name,last_name,email');

        return response()->json([
            'message' => 'Department updated successfully',
            'data' => $department,
        ]);
    }

    /**
     * Delete department
     */
    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully',
        ]);
    }

    /**
     * Get HOD options (staff users)
     */
    public function getHodOptions(): JsonResponse
    {
        $hodOptions = User::where(function ($query) {
            $query->where('role', 'hod')
                ->orWhere('role', 'staff');
        })
            ->select('id', 'first_name', 'last_name', 'email', 'department_code')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => "{$user->first_name} {$user->last_name}",
                    'email' => $user->email,
                    'department' => $user->department_code,
                ];
            });

        return response()->json([
            'data' => $hodOptions,
        ]);
    }

    /**
     * Get department statistics
     */
    public function getStats(Department $department): JsonResponse
    {
        $totalStudents = $department->students()->count();
        $totalFaculty = $department->staff()->count();
        $avgCgpa = (float) ($department->students()->avg('cgpa') ?? 0);
        $placedStudents = $department->students()->whereNotNull('placed_company')->count();
        $placementRate = $totalStudents > 0 ? round(($placedStudents / $totalStudents) * 100, 1) : 0;

        return response()->json([
            'data' => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'hod_name' => $department->hod ? ($department->hod->first_name . ' ' . $department->hod->last_name) : null,
                'staff_count' => $totalFaculty,
                'total_faculty' => $totalFaculty,
                'student_count' => $totalStudents,
                'total_students' => $totalStudents,
                'average_cgpa' => round($avgCgpa, 2),
                'placement_rate' => $placementRate,
                'courses_count' => $department->courses()->count(),
                'intake_capacity' => $department->intake_capacity,
                'status' => $department->status,
            ],
        ]);
    }
}
