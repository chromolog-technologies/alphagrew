<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MarksController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get students for marks entry
     */
    public function getStudents(Request $request)
    {
        $classId = $request->query('class_id');
        $examId = $request->query('exam_id');
        $subjectId = $request->query('subject_id');
        $totalMarks = $request->query('total_marks', 50);

        $students = [
            ['id' => 1, 'name' => 'Amit Kumar', 'rollNo' => '21CS001', 'marksObtained' => null, 'totalMarks' => $totalMarks],
            ['id' => 2, 'name' => 'Priya Sharma', 'rollNo' => '21CS002', 'marksObtained' => null, 'totalMarks' => $totalMarks],
            ['id' => 3, 'name' => 'Rajesh Singh', 'rollNo' => '21CS003', 'marksObtained' => null, 'totalMarks' => $totalMarks],
            ['id' => 4, 'name' => 'Anita Gupta', 'rollNo' => '21CS004', 'marksObtained' => null, 'totalMarks' => $totalMarks],
        ];

        return response()->json([
            'success' => true,
            'data' => $students,
            'class_id' => $classId,
            'exam_id' => $examId,
            'subject_id' => $subjectId,
            'total_marks' => $totalMarks,
        ]);
    }

    /**
     * Submit marks for students
     */
    public function submitMarks(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => 'required|integer',
            'subject_id' => 'required|integer',
            'class_id' => 'required|integer',
            'total_marks' => 'required|integer|min:1',
            'marks' => 'required|array',
            'marks.*.student_id' => 'required|integer',
            'marks.*.marks_obtained' => 'required|numeric|min:0',
        ]);

        $submittedMarks = count($validated['marks']);

        return response()->json([
            'success' => true,
            'message' => 'Marks submitted successfully for '.$submittedMarks.' students',
            'data' => [
                'exam_id' => $validated['exam_id'],
                'subject_id' => $validated['subject_id'],
                'class_id' => $validated['class_id'],
                'submitted_count' => $submittedMarks,
                'total_marks' => $validated['total_marks'],
            ],
        ]);
    }

    /**
     * Get list of exams
     */
    public function getExams()
    {
        $exams = [
            ['id' => 1, 'name' => 'Mid Semester - 1', 'type' => 'mid', 'max_marks' => 50],
            ['id' => 2, 'name' => 'Mid Semester - 2', 'type' => 'mid', 'max_marks' => 50],
            ['id' => 3, 'name' => 'End Semester', 'type' => 'end', 'max_marks' => 100],
        ];

        return response()->json([
            'success' => true,
            'data' => $exams,
        ]);
    }

    /**
     * Get marks statistics for a class/subject
     */
    public function getStatistics(Request $request)
    {
        $classId = $request->query('class_id');
        $examId = $request->query('exam_id');
        $subjectId = $request->query('subject_id');

        $stats = [
            'total_students' => 30,
            'marks_entered' => 28,
            'marks_pending' => 2,
            'average_marks' => 38.5,
            'highest_marks' => 48,
            'lowest_marks' => 22,
            'pass_count' => 26,
            'fail_count' => 2,
            'pass_percentage' => 86.67,
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'class_id' => $classId,
            'exam_id' => $examId,
            'subject_id' => $subjectId,
        ]);
    }

    /**
     * Download marks template
     */
    public function downloadTemplate(Request $request)
    {
        $examId = $request->query('exam_id');
        $subjectId = $request->query('subject_id');
        $classId = $request->query('class_id');

        return response()->json([
            'success' => true,
            'message' => 'Template generated successfully',
            'data' => [
                'file_name' => 'marks_template_'.$examId.'_'.$subjectId.'.xlsx',
                'download_url' => '/api/v1/staff/marks/template/download',
                'class_id' => $classId,
            ],
        ]);
    }

    /**
     * Upload marks from file
     */
    public function uploadMarks(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
            'exam_id' => 'required|integer',
            'subject_id' => 'required|integer',
            'class_id' => 'required|integer',
        ]);

        // In production: parse file and insert into database

        return response()->json([
            'success' => true,
            'message' => 'Marks uploaded successfully',
            'data' => [
                'records_processed' => 30,
                'records_imported' => 28,
                'errors' => 2,
                'exam_id' => $request->exam_id,
            ],
        ]);
    }
}
