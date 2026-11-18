<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ExamCoordinatorController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get all exams
     */
    public function getExams(Request $request)
    {
        $semester = $request->query('semester');
        $status = $request->query('status'); // scheduled, ongoing, completed

        $exams = [
            [
                'id' => 1,
                'name' => 'Mid Semester - 1',
                'type' => 'mid',
                'semester' => 5,
                'status' => 'completed',
                'start_date' => '2026-03-15',
                'end_date' => '2026-03-20',
                'subjects_count' => 6,
                'students_count' => 90,
            ],
            [
                'id' => 2,
                'name' => 'Mid Semester - 2',
                'type' => 'mid',
                'semester' => 5,
                'status' => 'ongoing',
                'start_date' => '2026-04-05',
                'end_date' => '2026-04-10',
                'subjects_count' => 6,
                'students_count' => 90,
            ],
            [
                'id' => 3,
                'name' => 'End Semester',
                'type' => 'end',
                'semester' => 5,
                'status' => 'scheduled',
                'start_date' => '2026-05-01',
                'end_date' => '2026-05-15',
                'subjects_count' => 6,
                'students_count' => 90,
            ],
        ];

        if ($status) {
            $exams = array_filter($exams, fn ($e) => $e['status'] === $status);
        }

        if ($semester) {
            $exams = array_filter($exams, fn ($e) => $e['semester'] == $semester);
        }

        return response()->json([
            'success' => true,
            'data' => array_values($exams),
            'total_exams' => count($exams),
        ]);
    }

    /**
     * Get exam details
     */
    public function getExamDetails($examId)
    {
        $exam = [
            'id' => 1,
            'name' => 'Mid Semester - 1',
            'type' => 'mid',
            'semester' => 5,
            'status' => 'ongoing',
            'start_date' => '2026-04-05',
            'end_date' => '2026-04-10',
            'subjects' => [
                ['id' => 1, 'code' => 'CS201', 'name' => 'Data Structures', 'max_marks' => 50],
                ['id' => 2, 'code' => 'CS203', 'name' => 'Database Management', 'max_marks' => 50],
            ],
            'invigilators_assigned' => 12,
            'classrooms_assigned' => 4,
            'marks_submitted' => 10,
            'marks_pending' => 6,
            'result_declared' => false,
        ];

        return response()->json([
            'success' => true,
            'data' => $exam,
        ]);
    }

    /**
     * Create new exam
     */
    public function createExam(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:mid,end',
            'semester' => 'required|integer',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'subjects' => 'required|array',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam created successfully',
            'data' => [
                'exam_id' => 4,
                'name' => $validated['name'],
                'status' => 'scheduled',
            ],
        ]);
    }

    /**
     * Assign invigilators to exam
     */
    public function assignInvigilators(Request $request, $examId)
    {
        $validated = $request->validate([
            'invigilators' => 'required|array',
            'invigilators.*' => 'integer',
            'date' => 'required|date',
            'time_slot' => 'required|string',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invigilators assigned successfully',
            'data' => [
                'exam_id' => $examId,
                'assigned_count' => count($validated['invigilators']),
            ],
        ]);
    }

    /**
     * Assign classrooms
     */
    public function assignClassrooms(Request $request, $examId)
    {
        $validated = $request->validate([
            'classrooms' => 'required|array',
            'classrooms.*.room_number' => 'required|string',
            'classrooms.*.capacity' => 'required|integer',
            'classrooms.*.date' => 'required|date',
            'classrooms.*.time' => 'required|string',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Classrooms assigned successfully',
            'data' => [
                'exam_id' => $examId,
                'classrooms_assigned' => count($validated['classrooms']),
            ],
        ]);
    }

    /**
     * Get exam progress
     */
    public function getProgress($examId)
    {
        $progress = [
            'total_students' => 90,
            'appeared' => 85,
            'absent' => 5,
            'appearance_percentage' => 94.44,
            'marks_submitted' => 18,
            'marks_pending' => 67,
            'submission_percentage' => 21.18,
            'result_status' => 'pending',
        ];

        return response()->json([
            'success' => true,
            'data' => $progress,
            'exam_id' => $examId,
        ]);
    }

    /**
     * Declare exam results
     */
    public function declareResults(Request $request, $examId)
    {
        $validated = $request->validate([
            'publish_date' => 'required|date',
            'publish_time' => 'required|string',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam results will be published on '.$validated['publish_date'].' at '.$validated['publish_time'],
            'data' => [
                'exam_id' => $examId,
                'publish_date' => $validated['publish_date'],
                'status' => 'scheduled for publication',
            ],
        ]);
    }

    /**
     * Get seating arrangement
     */
    public function getSeatingArrangement(Request $request)
    {
        $examId = $request->query('exam_id');
        $date = $request->query('date');

        $seating = [
            [
                'room_number' => '101',
                'capacity' => 30,
                'assigned_students' => 28,
                'invigilators' => 2,
                'time_slot' => '09:00 - 11:00',
                'subject' => 'Data Structures',
            ],
            [
                'room_number' => '102',
                'capacity' => 30,
                'assigned_students' => 30,
                'invigilators' => 2,
                'time_slot' => '09:00 - 11:00',
                'subject' => 'Database Management',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $seating,
            'exam_id' => $examId,
            'date' => $date,
        ]);
    }

    /**
     * Generate exam report
     */
    public function generateReport(Request $request)
    {
        $examId = $request->query('exam_id');

        return response()->json([
            'success' => true,
            'message' => 'Report generated successfully',
            'data' => [
                'file_name' => 'exam_report_'.$examId.'_'.date('Y-m-d').'.pdf',
                'download_url' => '/api/v1/staff/exam/report/download',
            ],
        ]);
    }
}
