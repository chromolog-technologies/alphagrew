<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get students for attendance marking
     */
    public function getStudents(Request $request)
    {
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $date = $request->query('date', now()->toDateString());

        // Sample data for attendance marking
        $students = [
            ['id' => 1, 'name' => 'Amit Kumar', 'rollNo' => '21CS001', 'status' => null],
            ['id' => 2, 'name' => 'Priya Sharma', 'rollNo' => '21CS002', 'status' => null],
            ['id' => 3, 'name' => 'Rajesh Singh', 'rollNo' => '21CS003', 'status' => null],
            ['id' => 4, 'name' => 'Anita Gupta', 'rollNo' => '21CS004', 'status' => null],
            ['id' => 5, 'name' => 'Vikram Patel', 'rollNo' => '21CS005', 'status' => null],
        ];

        return response()->json([
            'success' => true,
            'data' => $students,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'date' => $date,
        ]);
    }

    /**
     * Submit attendance for a class
     */
    public function submitAttendance(Request $request)
    {
        $validated = $request->validate([
            'class_id' => 'required|integer',
            'subject_id' => 'required|integer',
            'date' => 'required|date',
            'attendance' => 'required|array',
            'attendance.*.student_id' => 'required|integer',
            'attendance.*.status' => 'required|in:present,absent,late',
        ]);

        // In production, save to database
        // Attendance::createBatch($validated['attendance']);

        return response()->json([
            'success' => true,
            'message' => 'Attendance marked successfully for '.count($validated['attendance']).' students',
            'data' => [
                'class_id' => $validated['class_id'],
                'submitted_count' => count($validated['attendance']),
                'date' => $validated['date'],
            ],
        ]);
    }

    /**
     * Get attendance history
     */
    public function getHistory(Request $request)
    {
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $history = [
            [
                'date' => '2026-04-10',
                'total_students' => 30,
                'present' => 28,
                'absent' => 1,
                'late' => 1,
                'percentage' => 93.33,
            ],
            [
                'date' => '2026-04-09',
                'total_students' => 30,
                'present' => 27,
                'absent' => 2,
                'late' => 1,
                'percentage' => 90,
            ],
            [
                'date' => '2026-04-08',
                'total_students' => 30,
                'present' => 29,
                'absent' => 0,
                'late' => 1,
                'percentage' => 96.67,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $history,
            'class_id' => $classId,
            'subject_id' => $subjectId,
        ]);
    }

    /**
     * Get available classes for the staff
     */
    public function getClasses()
    {
        $classes = [
            ['id' => 1, 'name' => 'CSE-5A', 'semester' => 5, 'student_count' => 30],
            ['id' => 2, 'name' => 'CSE-5B', 'semester' => 5, 'student_count' => 28],
            ['id' => 3, 'name' => 'IT-5A', 'semester' => 5, 'student_count' => 32],
        ];

        return response()->json([
            'success' => true,
            'data' => $classes,
        ]);
    }

    /**
     * Get available subjects for a class
     */
    public function getSubjects(Request $request)
    {
        $classId = $request->query('class_id');

        $subjects = [
            ['id' => 1, 'code' => 'CS201', 'name' => 'Data Structures', 'credits' => 4],
            ['id' => 2, 'code' => 'CS203', 'name' => 'Database Management', 'credits' => 4],
            ['id' => 3, 'code' => 'CS205', 'name' => 'Web Development', 'credits' => 3],
        ];

        return response()->json([
            'success' => true,
            'data' => $subjects,
            'class_id' => $classId,
        ]);
    }
}
