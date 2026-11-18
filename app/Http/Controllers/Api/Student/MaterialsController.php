<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaterialsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function getMaterials(Request $request)
    {
        $student = auth()->user();
        $typeFilter = $request->query('type', 'all');

        // Sample materials data structure (in production, use DB)
        $materials = [
            [
                'id' => 1,
                'title' => 'Lecture 1: Introduction to Data Structures',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'type' => 'lecture',
                'upload_date' => '2025-03-20',
                'download_count' => 45,
                'file_size' => '12 MB',
                'download_url' => '/materials/lecture1.pdf',
            ],
            [
                'id' => 2,
                'title' => 'Chapter 2: Arrays and Linked Lists',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'type' => 'notes',
                'upload_date' => '2025-03-18',
                'download_count' => 32,
                'file_size' => '8 MB',
                'download_url' => '/materials/chapter2.pdf',
            ],
            [
                'id' => 3,
                'title' => 'Reference: Big O Notation',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'type' => 'reference',
                'upload_date' => '2025-03-15',
                'download_count' => 28,
                'file_size' => '5 MB',
                'download_url' => '/materials/big_o_notation.pdf',
            ],
            [
                'id' => 4,
                'title' => 'Video Tutorial: Graph Algorithms',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'type' => 'video',
                'upload_date' => '2025-03-10',
                'download_count' => 15,
                'file_size' => '250 MB',
                'download_url' => '/materials/graph_algorithms.mp4',
            ],
        ];

        if ($typeFilter !== 'all') {
            $materials = array_filter($materials, function ($m) use ($typeFilter) {
                return $m['type'] === $typeFilter;
            });
        }

        return response()->json([
            'success' => true,
            'data' => array_values($materials),
            'message' => 'Course materials retrieved successfully',
        ]);
    }

    public function getAssignments(Request $request)
    {
        $student = auth()->user();
        $statusFilter = $request->query('status', 'all');
        $courseFilter = $request->query('course_id', 'all');

        // Sample assignments data
        $assignments = [
            [
                'id' => 1,
                'title' => 'Assignment 1: Array Operations',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Implement basic array operations: insert, delete, search, sort',
                'due_date' => '2025-03-25',
                'status' => 'pending',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 100,
                'marks' => null,
                'submitted_date' => null,
            ],
            [
                'id' => 2,
                'title' => 'Assignment 2: Linked List Implementation',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Create a complete linked list with all operations',
                'due_date' => '2025-03-30',
                'status' => 'graded',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 100,
                'marks' => 85,
                'submitted_date' => '2025-03-29',
            ],
            [
                'id' => 3,
                'title' => 'Mini Project: Stack-based Calculator',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Build a calculator using stack to evaluate expressions',
                'due_date' => '2025-04-10',
                'status' => 'submitted',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 150,
                'marks' => null,
                'submitted_date' => '2025-04-08',
            ],
            [
                'id' => 4,
                'title' => 'Case Study: Database Query Optimization',
                'course' => 'Database Management',
                'course_code' => 'CS305',
                'description' => 'Analyze and optimize a complex SQL query',
                'due_date' => '2025-04-15',
                'status' => 'pending',
                'faculty' => 'Dr. Priya Sharma',
                'total_marks' => 80,
                'marks' => null,
                'submitted_date' => null,
            ],
        ];

        // Apply filters
        if ($statusFilter !== 'all') {
            $assignments = array_filter($assignments, function ($a) use ($statusFilter) {
                return $a['status'] === $statusFilter;
            });
        }

        if ($courseFilter !== 'all') {
            $assignments = array_filter($assignments, function ($a) use ($courseFilter) {
                return $a['course_code'] === $courseFilter;
            });
        }

        // Calculate statistics
        $allAssignments = [
            [
                'id' => 1,
                'title' => 'Assignment 1: Array Operations',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Implement basic array operations: insert, delete, search, sort',
                'due_date' => '2025-03-25',
                'status' => 'pending',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 100,
                'marks' => null,
                'submitted_date' => null,
            ],
            [
                'id' => 2,
                'title' => 'Assignment 2: Linked List Implementation',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Create a complete linked list with all operations',
                'due_date' => '2025-03-30',
                'status' => 'graded',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 100,
                'marks' => 85,
                'submitted_date' => '2025-03-29',
            ],
            [
                'id' => 3,
                'title' => 'Mini Project: Stack-based Calculator',
                'course' => 'Data Structures',
                'course_code' => 'CS201',
                'description' => 'Build a calculator using stack to evaluate expressions',
                'due_date' => '2025-04-10',
                'status' => 'submitted',
                'faculty' => 'Prof. Rajesh Kumar',
                'total_marks' => 150,
                'marks' => null,
                'submitted_date' => '2025-04-08',
            ],
            [
                'id' => 4,
                'title' => 'Case Study: Database Query Optimization',
                'course' => 'Database Management',
                'course_code' => 'CS305',
                'description' => 'Analyze and optimize a complex SQL query',
                'due_date' => '2025-04-15',
                'status' => 'pending',
                'faculty' => 'Dr. Priya Sharma',
                'total_marks' => 80,
                'marks' => null,
                'submitted_date' => null,
            ],
        ];

        $pendingCount = count(array_filter($allAssignments, fn($a) => $a['status'] === 'pending'));
        $gradedAssignments = array_filter($allAssignments, fn($a) => $a['status'] === 'graded' && $a['marks'] !== null);
        $gradedCount = count($gradedAssignments);
        $avgGrade = $gradedCount > 0 ? array_sum(array_column($gradedAssignments, 'marks')) / $gradedCount : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'assignments' => array_values($assignments),
                'statistics' => [
                    'pending_assignments' => $pendingCount,
                    'graded_assignments' => $gradedCount,
                    'average_grade' => round($avgGrade, 2),
                ],
            ],
            'message' => 'Assignments retrieved successfully',
        ]);
    }

    public function submitAssignment(Request $request)
    {
        $request->validate([
            'assignment_id' => 'required|integer',
            'file' => 'required|file|mimes:pdf,doc,docx,zip',
        ]);

        // In production, save file and create submission record
        return response()->json([
            'success' => true,
            'message' => 'Assignment submitted successfully',
            'data' => [
                'assignment_id' => $request->assignment_id,
                'submitted_at' => now(),
            ],
        ]);
    }
}
