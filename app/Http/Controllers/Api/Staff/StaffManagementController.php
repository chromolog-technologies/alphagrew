<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StaffManagementController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get all staff members
     */
    public function getStaff(Request $request)
    {
        $department = $request->query('department_id');
        $designation = $request->query('designation_id');

        $staff = [
            [
                'id' => 1,
                'name' => 'Dr. Rajesh Kumar',
                'email' => 'rajesh@alphagrew.dev',
                'phone' => '+91 9876543210',
                'designation' => 'Professor',
                'department' => 'CSE',
                'specialization' => 'Data Structures',
                'joinDate' => '2015-06-15',
                'experience' => 8,
                'status' => 'active',
            ],
            [
                'id' => 2,
                'name' => 'Dr. Priya Sharma',
                'email' => 'priya@alphagrew.dev',
                'phone' => '+91 9876543211',
                'designation' => 'Associate Professor',
                'department' => 'CSE',
                'specialization' => 'Database Systems',
                'joinDate' => '2017-08-20',
                'experience' => 6,
                'status' => 'active',
            ],
            [
                'id' => 3,
                'name' => 'Prof. Amit Patel',
                'email' => 'amit@alphagrew.dev',
                'phone' => '+91 9876543212',
                'designation' => 'Assistant Professor',
                'department' => 'CSE',
                'specialization' => 'Web Development',
                'joinDate' => '2019-01-10',
                'experience' => 4,
                'status' => 'active',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $staff,
            'total_staff' => count($staff),
            'active_count' => count($staff),
        ]);
    }

    /**
     * Get staff member details
     */
    public function getStaffById($staffId)
    {
        $staff = [
            'id' => 1,
            'name' => 'Dr. Rajesh Kumar',
            'email' => 'rajesh@alphagrew.dev',
            'phone' => '+91 9876543210',
            'designation' => 'Professor',
            'department' => 'CSE',
            'specialization' => 'Data Structures',
            'joinDate' => '2015-06-15',
            'experience' => 8,
            'status' => 'active',
            'qualifications' => ['B.Tech', 'M.Tech', 'PhD'],
            'classes_assigned' => ['CSE-5A', 'CSE-5B'],
            'subjects' => ['Data Structures', 'Algorithms'],
            'office_hours' => 'Monday 2-4 PM, Wednesday 10-12 AM',
        ];

        return response()->json([
            'success' => true,
            'data' => $staff,
        ]);
    }

    /**
     * Create new staff member
     */
    public function createStaff(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string',
            'designation_id' => 'required|integer',
            'department_id' => 'required|integer',
            'specialization' => 'nullable|string',
            'join_date' => 'required|date',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff member created successfully',
            'data' => [
                'staff_id' => 4,
                'name' => $validated['name'],
                'email' => $validated['email'],
            ],
        ]);
    }

    /**
     * Update staff member
     */
    public function updateStaff(Request $request, $staffId)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email',
            'phone' => 'sometimes|string',
            'designation_id' => 'sometimes|integer',
            'specialization' => 'sometimes|nullable|string',
            'office_hours' => 'sometimes|string',
            'status' => 'sometimes|in:active,inactive',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff member updated successfully',
            'data' => [
                'staff_id' => $staffId,
                'updated_fields' => count($validated),
            ],
        ]);
    }

    /**
     * Delete staff member
     */
    public function deleteStaff($staffId)
    {
        return response()->json([
            'success' => true,
            'message' => 'Staff member deleted successfully',
            'data' => ['staff_id' => $staffId],
        ]);
    }

    /**
     * Assign classes to staff
     */
    public function assignClasses(Request $request, $staffId)
    {
        $validated = $request->validate([
            'classes' => 'required|array',
            'classes.*' => 'integer',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Classes assigned successfully',
            'data' => [
                'staff_id' => $staffId,
                'classes_assigned' => count($validated['classes']),
                'class_ids' => $validated['classes'],
            ],
        ]);
    }

    /**
     * Get staff workload
     */
    public function getWorkload(Request $request)
    {
        $staffId = $request->query('staff_id');

        $workload = [
            'classes_assigned' => 3,
            'subjects_taught' => 2,
            'students_total' => 95,
            'office_hours_per_week' => 4,
            'research_projects' => 2,
            'papers_published' => 1,
        ];

        return response()->json([
            'success' => true,
            'data' => $workload,
            'staff_id' => $staffId,
        ]);
    }

    /**
     * Get departments list
     */
    public function getDepartments()
    {
        $departments = [
            ['id' => 1, 'name' => 'Computer Science', 'head' => 'Dr. Vendor Kumar', 'staff_count' => 15],
            ['id' => 2, 'name' => 'Information Technology', 'head' => 'Dr. Rajesh Sharma', 'staff_count' => 12],
            ['id' => 3, 'name' => 'Electronics', 'head' => 'Prof. Anita Singh', 'staff_count' => 10],
        ];

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    /**
     * Get designations list
     */
    public function getDesignations()
    {
        $designations = [
            ['id' => 1, 'name' => 'Professor', 'level' => 1],
            ['id' => 2, 'name' => 'Associate Professor', 'level' => 2],
            ['id' => 3, 'name' => 'Assistant Professor', 'level' => 3],
            ['id' => 4, 'name' => 'Lecturer', 'level' => 4],
        ];

        return response()->json([
            'success' => true,
            'data' => $designations,
        ]);
    }
}
