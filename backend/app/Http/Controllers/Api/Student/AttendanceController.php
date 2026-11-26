<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $studentId = $this->ownStudentId($request);

        // Get attendance records for the current student
        $attendanceBySubject = Attendance::where('student_id', $studentId)
            ->with(['subject'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(function ($record) {
                return $record->subject->name ?? 'Unknown Subject';
            })
            ->map(function ($records) {
                $total = $records->count();
                $present = $records->where('status', 'present')->count();
                $absent = $records->where('status', 'absent')->count();
                $late = $records->where('status', 'late')->count();

                return [
                    'subject_id' => $records->first()->subject_id,
                    'subject' => $records->first()->subject?->name,
                    'subject_code' => $records->first()->subject?->code ?? 'N/A',
                    'total_classes' => $total,
                    'present' => $present,
                    'absent' => $absent,
                    'late' => $late,
                    'percentage' => $total > 0 ? round(($present / $total) * 100, 2) : 0,
                    'status' => $total > 0 ? (($present / $total) * 100 >= 75 ? 'good' : (($present / $total) * 100 >= 50 ? 'warning' : 'critical')) : 'unknown',
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $attendanceBySubject,
            'message' => 'Attendance records retrieved successfully',
        ]);
    }

    public function getDetailedRecords(Request $request)
    {
        $studentId = $this->ownStudentId($request);
        $subjectFilter = $request->query('subject_id');

        $query = Attendance::where('student_id', $studentId)
            ->with(['subject', 'faculty'])
            ->orderBy('created_at', 'desc');

        if ($subjectFilter) {
            $query->where('subject_id', $subjectFilter);
        }

        $records = $query->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->attendance_date?->format('Y-m-d'),
                    'subject_id' => $record->subject_id,
                    'subject_code' => $record->subject?->code,
                    'subject' => $record->subject->name ?? 'Unknown Subject',
                    'class' => 'N/A',
                    'status' => $record->status,
                    'marked_by' => $record->faculty->name ?? 'Admin',
                    'remarks' => $record->remarks ?? 'N/A',
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $records,
            'message' => 'Detailed attendance records retrieved',
        ]);
    }

    /**
     * One month of the student's own attendance grouped by day, for the calendar view.
     * ?month=YYYY-MM (default: this month). Each day lists its sessions and an overall status:
     * present (all present), absent (all absent), partial (a mix), leave (all leave).
     */
    public function calendar(Request $request)
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'subject_id' => ['nullable', 'integer'],
        ]);

        $month = isset($validated['month'])
            ? Carbon::createFromFormat('!Y-m', $validated['month'])
            : now()->startOfMonth();
        $from = $month->copy()->startOfMonth();
        $to = $month->copy()->endOfMonth();

        $studentId = $this->ownStudentId($request);

        $records = Attendance::query()
            ->where('student_id', $studentId)
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()])
            ->when($validated['subject_id'] ?? null, fn ($q, $subjectId) => $q->where('subject_id', $subjectId))
            ->with(['subject:id,name,code', 'faculty:id,name'])
            ->orderBy('attendance_date')
            ->orderBy('id')
            ->get();

        $days = $records
            ->groupBy(fn (Attendance $record) => $record->attendance_date->toDateString())
            ->map(function ($dayRecords, string $date) {
                $counts = $this->countStatuses($dayRecords);

                return [
                    'date' => $date,
                    ...$counts,
                    'status' => $this->dayStatus($counts),
                    'sessions' => $dayRecords->map(fn (Attendance $record) => [
                        'id' => $record->id,
                        'subject_id' => $record->subject_id,
                        'subject' => $record->subject?->name,
                        'subject_code' => $record->subject?->code,
                        'status' => $record->status,
                        'marked_by' => $record->faculty?->name,
                        'remarks' => $record->remarks,
                    ])->values(),
                ];
            })
            ->values();

        $summary = $this->countStatuses($records);
        $attended = $summary['present'] + $summary['late'];

        return response()->json([
            'success' => true,
            'data' => [
                'month' => $from->format('Y-m'),
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'summary' => [
                    ...$summary,
                    'days_recorded' => $days->count(),
                    // Late counts as attended.
                    'percentage' => $summary['total'] > 0 ? round($attended / $summary['total'] * 100, 1) : null,
                ],
                'days' => $days,
            ],
            'message' => 'Attendance calendar retrieved',
        ]);
    }

    /** @return array{total: int, present: int, absent: int, late: int, leave: int, other: int} */
    private function countStatuses($records): array
    {
        return [
            'total' => $records->count(),
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'late' => $records->where('status', 'late')->count(),
            'leave' => $records->where('status', 'leave')->count(),
            'other' => $records->where('status', 'other')->count(),
        ];
    }

    private function dayStatus(array $counts): string
    {
        $attended = $counts['present'] + $counts['late'];
        if ($counts['total'] === 0) {
            return 'none';
        }
        if ($attended === $counts['total']) {
            return 'present';
        }
        if ($counts['absent'] === $counts['total']) {
            return 'absent';
        }
        if ($counts['leave'] === $counts['total']) {
            return 'leave';
        }

        return 'partial';
    }

    public function getStatistics(Request $request)
    {
        $studentId = $this->ownStudentId($request);

        $totalClasses = Attendance::where('student_id', $studentId)->count();
        $presentCount = Attendance::where('student_id', $studentId)
            ->where('status', 'present')
            ->count();
        $absentCount = Attendance::where('student_id', $studentId)
            ->where('status', 'absent')
            ->count();
        $lateCount = Attendance::where('student_id', $studentId)
            ->where('status', 'late')
            ->count();

        $overallPercentage = $totalClasses > 0 ? round(($presentCount / $totalClasses) * 100, 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'total_classes' => $totalClasses,
                'present' => $presentCount,
                'absent' => $absentCount,
                'late' => $lateCount,
                'overall_percentage' => $overallPercentage,
                'status' => $overallPercentage >= 75 ? 'good' : ($overallPercentage >= 50 ? 'warning' : 'critical'),
            ],
            'message' => 'Attendance statistics retrieved',
        ]);
    }

    /**
     * attendance.student_id points at students, not users: resolve the signed-in user's
     * students row. Null (no records) for an account that isn't a student.
     */
    private function ownStudentId(Request $request): ?int
    {
        return Student::where('user_id', $request->user()->id)->value('id');
    }
}
