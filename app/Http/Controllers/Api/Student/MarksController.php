<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Mark;
use App\Models\Student;

class MarksController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $studentId = $this->resolveStudentId($user);
        $examFilter = $request->query('exam_id');
        $subjectFilter = $request->query('subject_id');

        if (!$studentId) {
            return response()->json([
                'success' => true,
                'data' => [
                    'overall_percentage' => 0,
                    'subject_performance' => [],
                    'all_marks' => [],
                ],
                'message' => 'No student profile linked for current user',
            ]);
        }

        $query = Mark::where('student_id', $studentId)
            ->with(['exam.subject', 'subject'])
            ->orderBy('created_at', 'desc');

        if ($examFilter) {
            $query->where('exam_id', $examFilter);
        }

        if ($subjectFilter) {
            $query->where('subject_id', $subjectFilter);
        }

        $marks = $query->get();

        $subjectPerformance = $marks->groupBy(function ($mark) {
            return $mark->subject?->id ?? $mark->exam?->subject?->id ?? 'unknown';
        })
            ->map(function ($subjectMarks) {
                $total = $subjectMarks->count();
                $avgPercentage = $subjectMarks->avg('percentage');
                $bestGrade = $subjectMarks->max('percentage');

                $subjectFirstRecord = $subjectMarks->first();
                $subject = $subjectFirstRecord->subject ?? $subjectFirstRecord->exam?->subject;

                return [
                    'subject_id' => $subject?->id,
                    'subject_name' => $subject?->name ?? 'Unknown Subject',
                    'subject_code' => $subject?->code ?? 'N/A',
                    'exams_taken' => $total,
                    'average_percentage' => round($avgPercentage, 2),
                    'best_grade_percentage' => $bestGrade,
                    'best_grade' => $this->getGrade($bestGrade),
                    'status' => $avgPercentage >= 70 ? 'excellent' : ($avgPercentage >= 60 ? 'good' : 'need_improvement'),
                ];
            })
            ->values();

        $overallPercentage = $marks->count() > 0 ? round($marks->avg('percentage'), 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'overall_percentage' => $overallPercentage,
                'subject_performance' => $subjectPerformance,
                'all_marks' => $marks->map(function ($mark) {
                    $subject = $mark->subject ?? $mark->exam?->subject;
                    $totalMarks = $mark->total_marks ?? $mark->exam?->max_marks ?? 100;
                    $percentage = $mark->percentage;

                    if ($percentage === null && $mark->marks_obtained !== null && $totalMarks > 0) {
                        $percentage = round(($mark->marks_obtained / $totalMarks) * 100, 2);
                    }

                    return [
                        'id' => $mark->id,
                        'exam' => $mark->exam->name ?? 'N/A',
                        'subject' => $subject?->name ?? 'Unknown Subject',
                        'marks_obtained' => $mark->marks_obtained,
                        'total_marks' => $totalMarks,
                        'percentage' => $percentage ?? 0,
                        'grade' => $this->getGrade($percentage ?? 0),
                        'date' => $mark->created_at->format('Y-m-d'),
                    ];
                }),
            ],
            'message' => 'Marks retrieved successfully',
        ]);
    }

    public function getStatistics(Request $request)
    {
        $user = auth()->user();
        $studentId = $this->resolveStudentId($user);

        if (!$studentId) {
            return response()->json([
                'success' => true,
                'data' => [
                    'total_exams' => 0,
                    'average_percentage' => 0,
                    'best_percentage' => 0,
                    'worst_percentage' => 0,
                    'grade_distribution' => [],
                ],
                'message' => 'No student profile linked for current user',
            ]);
        }

        $allMarks = Mark::where('student_id', $studentId)->get();

        if ($allMarks->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'total_exams' => 0,
                    'average_percentage' => 0,
                    'best_percentage' => 0,
                    'worst_percentage' => 0,
                    'grade_distribution' => [],
                ],
                'message' => 'No marks found',
            ]);
        }

        $gradeDistribution = [
            'A+' => $allMarks->where('percentage', '>=', 90)->count(),
            'A' => $allMarks->where('percentage', '>=', 80)->where('percentage', '<', 90)->count(),
            'B' => $allMarks->where('percentage', '>=', 70)->where('percentage', '<', 80)->count(),
            'C' => $allMarks->where('percentage', '>=', 60)->where('percentage', '<', 70)->count(),
            'D' => $allMarks->where('percentage', '>=', 50)->where('percentage', '<', 60)->count(),
            'F' => $allMarks->where('percentage', '<', 50)->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'total_exams' => $allMarks->count(),
                'average_percentage' => round($allMarks->avg('percentage'), 2),
                'best_percentage' => $allMarks->max('percentage'),
                'worst_percentage' => $allMarks->min('percentage'),
                'grade_distribution' => $gradeDistribution,
            ],
            'message' => 'Mark statistics retrieved',
        ]);
    }

    private function getGrade($percentage)
    {
        if ($percentage >= 90) return 'A+';
        if ($percentage >= 80) return 'A';
        if ($percentage >= 70) return 'B';
        if ($percentage >= 60) return 'C';
        if ($percentage >= 50) return 'D';
        return 'F';
    }

    private function resolveStudentId($user): ?int
    {
        if (!$user) {
            return null;
        }

        if ($user->relationLoaded('student') ? $user->student : $user->student()->exists()) {
            return optional($user->student)->id;
        }

        return Student::query()
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->value('id');
    }
}
