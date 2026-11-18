<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get academic performance report
     */
    public function getAcademicPerformance(Request $request)
    {
        $semester = $request->query('semester', 5);

        $report = [
            'semester' => $semester,
            'total_students' => 360,
            'class_wise_performance' => [
                [
                    'class' => 'CSE-5A',
                    'avg_gpa' => 8.2,
                    'pass_percentage' => 95,
                    'distinction' => 12,
                    'first_class' => 18,
                ],
                [
                    'class' => 'CSE-5B',
                    'avg_gpa' => 7.95,
                    'pass_percentage' => 92,
                    'distinction' => 8,
                    'first_class' => 15,
                ],
            ],
            'subject_wise_performance' => [
                [
                    'subject' => 'Data Structures',
                    'avg_marks' => 38.5,
                    'pass_percentage' => 89,
                    'distinction' => 20,
                ],
                [
                    'subject' => 'Database Management',
                    'avg_marks' => 36.2,
                    'pass_percentage' => 85,
                    'distinction' => 15,
                ],
            ],
            'semester_statistics' => [
                'highest_gpa' => 9.4,
                'lowest_gpa' => 5.2,
                'median_gpa' => 7.8,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get attendance report
     */
    public function getAttendanceReport(Request $request)
    {
        $semester = $request->query('semester', 5);
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $report = [
            'period' => $startDate.' to '.$endDate,
            'total_working_days' => 60,
            'class_wise_attendance' => [
                [
                    'class' => 'CSE-5A',
                    'avg_attendance' => 92.5,
                    'critical_students' => 2,
                    'status' => 'Good',
                ],
                [
                    'class' => 'CSE-5B',
                    'avg_attendance' => 89.3,
                    'critical_students' => 4,
                    'status' => 'Average',
                ],
            ],
            'subject_wise_attendance' => [
                [
                    'subject' => 'Data Structures',
                    'avg_attendance' => 91.5,
                ],
                [
                    'subject' => 'Database Management',
                    'avg_attendance' => 90.2,
                ],
            ],
            'critical_alerts' => [
                ['student' => 'Rajesh Singh', 'attendance' => 65, 'status' => 'At Risk'],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get placement analytics
     */
    public function getPlacementAnalytics()
    {
        $analytics = [
            'overall_placement_rate' => 92.5,
            'batch_wise' => [
                [
                    'batch' => '2025',
                    'total_students' => 120,
                    'placed' => 110,
                    'placement_rate' => 91.67,
                    'avg_package' => '4.3 LPA',
                    'highest' => '8.5 LPA',
                    'lowest' => '3.0 LPA',
                ],
                [
                    'batch' => '2024',
                    'total_students' => 115,
                    'placed' => 108,
                    'placement_rate' => 93.91,
                    'avg_package' => '4.1 LPA',
                    'highest' => '7.2 LPA',
                    'lowest' => '3.2 LPA',
                ],
            ],
            'company_wise' => [
                ['company' => 'TCS', 'count' => 25, 'avg_package' => '3.8 LPA'],
                ['company' => 'Infosys', 'count' => 20, 'avg_package' => '4.0 LPA'],
                ['company' => 'Wipro', 'count' => 18, 'avg_package' => '3.9 LPA'],
            ],
            'domain_wise' => [
                ['domain' => 'Software Development', 'count' => 68],
                ['domain' => 'Data Analytics', 'count' => 15],
                ['domain' => 'Cloud Engineering', 'count' => 12],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Get research and innovation report
     */
    public function getResearchReport()
    {
        $report = [
            'active_research_projects' => 8,
            'published_papers' => 12,
            'patents_filed' => 2,
            'collaborations' => [
                ['organization' => 'IIT Delhi', 'type' => 'Joint Research'],
                ['organization' => 'DRDO', 'type' => 'Consultancy'],
            ],
            'faculty_contributions' => [
                [
                    'faculty' => 'Dr. Rajesh Kumar',
                    'papers' => 4,
                    'patents' => 1,
                    'projects' => 2,
                ],
                [
                    'faculty' => 'Dr. Priya Sharma',
                    'papers' => 3,
                    'patents' => 1,
                    'projects' => 2,
                ],
            ],
            'student_achievements' => [
                ['type' => 'Hackathons', 'count' => 8],
                ['type' => 'Competitions', 'count' => 12],
                ['type' => 'Publications', 'count' => 3],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get resource utilization report
     */
    public function getResourceUtilization()
    {
        $report = [
            'labs' => [
                [
                    'name' => 'Computer Lab A',
                    'total_hours' => 480,
                    'utilized_hours' => 420,
                    'utilization_percentage' => 87.5,
                    'current_status' => 'Functional',
                ],
                [
                    'name' => 'Networking Lab',
                    'total_hours' => 480,
                    'utilized_hours' => 380,
                    'utilization_percentage' => 79.17,
                    'current_status' => 'Functional',
                ],
            ],
            'library' => [
                'books_issued' => 1250,
                'digital_resources_accessed' => 3450,
                'avg_daily_visitors' => 85,
            ],
            'classroom_utilization' => [
                'total_classes_scheduled' => 600,
                'classes_conducted' => 590,
                'utilization_percentage' => 98.33,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Generate and export custom report
     */
    public function generateCustomReport(Request $request)
    {
        $validated = $request->validate([
            'report_type' => 'required|in:academic,attendance,placement,research,resource',
            'semester' => 'sometimes|integer',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'format' => 'required|in:pdf,excel',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Report generated successfully',
            'data' => [
                'file_name' => $validated['report_type'].'_report_'.date('Y-m-d').'.'.$validated['format'],
                'download_url' => '/api/v1/staff/reports/download',
                'generated_at' => now(),
            ],
        ]);
    }
}
