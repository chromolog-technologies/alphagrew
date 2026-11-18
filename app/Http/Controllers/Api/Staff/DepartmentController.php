<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get department overview
     */
    public function getOverview(Request $request)
    {
        $departmentId = $request->query('department_id', 1);

        $overview = [
            'id' => $departmentId,
            'name' => 'Computer Science & Engineering',
            'head' => 'Dr. Rajesh Kumar',
            'email' => 'hod.cse@alphagrew.dev',
            'phone' => '+91 9876543210',
            'establishment_year' => 2010,
            'accreditation' => 'AICTE Approved',
            'vision' => 'To provide quality education in computer science',
            'mission' => 'Excellence in teaching and research',
            'total_staff' => 15,
            'total_students' => 360,
            'programs' => [
                ['name' => 'B.Tech CSE', 'duration' => '4 Years', 'intake' => 120],
                ['name' => 'M.Tech CSE', 'duration' => '2 Years', 'intake' => 30],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }

    /**
     * Get department staff
     */
    public function getStaff(Request $request)
    {
        $departmentId = $request->query('department_id', 1);

        $staff = [
            [
                'id' => 1,
                'name' => 'Dr. Rajesh Kumar',
                'designation' => 'Professor & HOD',
                'specialization' => 'Data Structures',
                'experience' => 8,
                'email' => 'rajesh@alphagrew.dev',
                'office_hours' => 'Mon 2-4 PM, Wed 10-12 AM',
                'status' => 'active',
            ],
            [
                'id' => 2,
                'name' => 'Dr. Priya Sharma',
                'designation' => 'Associate Professor',
                'specialization' => 'Database Systems',
                'experience' => 6,
                'email' => 'priya@alphagrew.dev',
                'office_hours' => 'Tue 3-5 PM, Thu 11-1 PM',
                'status' => 'active',
            ],
            [
                'id' => 3,
                'name' => 'Prof. Amit Patel',
                'designation' => 'Assistant Professor',
                'specialization' => 'Web Development',
                'experience' => 4,
                'email' => 'amit@alphagrew.dev',
                'office_hours' => 'Mon 11-1 PM, Fri 2-4 PM',
                'status' => 'active',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $staff,
            'total_staff' => count($staff),
            'department_id' => $departmentId,
        ]);
    }

    /**
     * Get department classes
     */
    public function getClasses(Request $request)
    {
        $departmentId = $request->query('department_id', 1);

        $classes = [
            [
                'id' => 1,
                'name' => 'CSE-5A',
                'semester' => 5,
                'strength' => 30,
                'class_teacher' => 'Dr. Rajesh Kumar',
                'subjects' => 6,
                'avg_attendance' => 92,
            ],
            [
                'id' => 2,
                'name' => 'CSE-5B',
                'semester' => 5,
                'strength' => 28,
                'class_teacher' => 'Dr. Priya Sharma',
                'subjects' => 6,
                'avg_attendance' => 89,
            ],
            [
                'id' => 3,
                'name' => 'CSE-7A',
                'semester' => 7,
                'strength' => 32,
                'class_teacher' => 'Prof. Amit Patel',
                'subjects' => 5,
                'avg_attendance' => 85,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $classes,
            'total_classes' => count($classes),
            'department_id' => $departmentId,
        ]);
    }

    /**
     * Get department performance metrics
     */
    public function getPerformance()
    {
        $performance = [
            'total_students' => 360,
            'active_students' => 355,
            'avg_gpa' => 7.85,
            'placement_rate' => 92.5,
            'avg_package' => '4.3 LPA',
            'highest_package' => '8.5 LPA',
            'research_papers' => 12,
            'research_projects' => 8,
            'faculty_certifications' => 25,
            'student_achievements' => 45,
        ];

        return response()->json([
            'success' => true,
            'data' => $performance,
        ]);
    }

    /**
     * Get department budget allocation
     */
    public function getBudget(Request $request)
    {
        $year = $request->query('year', date('Y'));

        $budget = [
            'total_allocated' => 50000,
            'spending_categories' => [
                ['category' => 'Staff Salaries', 'allocated' => 30000, 'spent' => 28000],
                ['category' => 'Equipment & Lab', 'allocated' => 10000, 'spent' => 8500],
                ['category' => 'Research Projects', 'allocated' => 5000, 'spent' => 3200],
                ['category' => 'Infrastructure', 'allocated' => 5000, 'spent' => 2100],
            ],
            'total_spent' => 41800,
            'utilization_percentage' => 83.6,
            'fiscal_year' => $year,
        ];

        return response()->json([
            'success' => true,
            'data' => $budget,
            'year' => $year,
        ]);
    }

    /**
     * Get department announcements
     */
    public function getAnnouncements(Request $request)
    {
        $departmentId = $request->query('department_id', 1);

        $announcements = [
            [
                'id' => 1,
                'title' => 'Mid Semester Exams Schedule Released',
                'content' => 'Mid semester exams will be held from April 5-10, 2026',
                'issued_by' => 'Dr. Rajesh Kumar',
                'issued_date' => '2026-04-01',
                'priority' => 'high',
            ],
            [
                'id' => 2,
                'title' => 'Research Paper Submission Deadline',
                'content' => 'Faculty members are requested to submit their research papers by April 15',
                'issued_by' => 'Dr. Rajesh Kumar',
                'issued_date' => '2026-03-28',
                'priority' => 'medium',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $announcements,
            'department_id' => $departmentId,
        ]);
    }

    /**
     * Get department infrastructure details
     */
    public function getInfrastructure()
    {
        $infrastructure = [
            'classrooms' => ['total' => 8, 'smart_boards' => 5, 'lab_equipped' => 3],
            'labs' => [
                ['name' => 'Computer Lab A', 'systems' => 30, 'dedicated_staff' => 1],
                ['name' => 'Computer Lab B', 'systems' => 25, 'dedicated_staff' => 1],
                ['name' => 'Networking Lab', 'systems' => 20, 'dedicated_staff' => 1],
            ],
            'library' => ['books' => 5000, 'ebooks' => 15000, 'journals' => 50],
            'sports_facilities' => 'Cricket Ground, Basketball Court, Gym',
            'canteen' => 'Available',
            'hostel' => 'Yes',
        ];

        return response()->json([
            'success' => true,
            'data' => $infrastructure,
        ]);
    }
}
