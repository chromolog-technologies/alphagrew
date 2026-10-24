<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Timetable;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;

class TimetableController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $studentClass = $this->currentClass($request->user());

        if (!$studentClass) {
            return response()->json([
                'success' => false,
                'message' => 'Student class not found',
            ], 404);
        }

        // Get timetable for student's class
        $timetable = Timetable::activeFor($studentClass->id)
            ->with(['class', 'subject', 'faculty'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $formattedTimetable = $timetable->map(function ($slot) use ($studentClass) {
            return [
                'id' => $slot->id,
                'course_code' => $slot->subject?->code ?? 'N/A',
                'course_name' => $slot->subject?->name,
                'faculty' => $slot->faculty->name ?? 'TBA',
                'day' => $slot->day_of_week,
                'start_time' => $this->formatTime($slot->start_time),
                'end_time' => $this->formatTime($slot->end_time),
                'room' => $slot->room_number ?? 'TBA',
                'building' => $slot->building ?? 'A',
                'semester' => $studentClass->semester?->name ?? 'N/A',
            ];
        });

        // Group by day
        $timetableByDay = $formattedTimetable->groupBy('day');

        // Calculate stats
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $dailySchedule = [];

        foreach ($days as $day) {
            $daySlots = $timetableByDay->get($day, collect());
            $dailySchedule[$day] = [
                'classes' => $daySlots->count(),
                'slots' => $daySlots->values(),
            ];
        }

        $totalLearningHours = 0;
        foreach ($formattedTimetable as $slot) {
            // Calculate hours (simple approximation)
            $totalLearningHours += 2; // Assuming 2 hours per class
        }

        return response()->json([
            'success' => true,
            'data' => [
                'all_classes' => $formattedTimetable->count(),
                'learning_hours_per_week' => $totalLearningHours,
                'unique_faculty' => $formattedTimetable->unique('faculty')->count(),
                'daily_schedule' => $dailySchedule,
                'all_slots' => $formattedTimetable,
            ],
            'message' => 'Timetable retrieved successfully',
        ]);
    }

    public function getByDay(Request $request)
    {
        $day = $request->query('day', 'Monday');

        $studentClass = $this->currentClass($request->user());

        if (!$studentClass) {
            return response()->json([
                'success' => false,
                'message' => 'Student class not found',
            ], 404);
        }

        $timetable = Timetable::activeFor($studentClass->id)
            ->where('day_of_week', $day)
            ->with(['subject', 'faculty'])
            ->orderBy('start_time')
            ->get();

        $slots = $timetable->map(function ($slot) use ($studentClass) {
            return [
                'id' => $slot->id,
                'course_code' => $slot->subject?->code,
                'course_name' => $slot->subject?->name,
                'faculty' => $slot->faculty->name ?? 'TBA',
                'time' => $this->formatTime($slot->start_time) . ' - ' . $this->formatTime($slot->end_time),
                'start_time' => $this->formatTime($slot->start_time),
                'end_time' => $this->formatTime($slot->end_time),
                'room' => $slot->room_number,
                'building' => $slot->building,
                'semester' => $studentClass->semester?->name,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'day' => $day,
                'classes_count' => $slots->count(),
                'slots' => $slots,
            ],
            'message' => "Timetable for $day retrieved",
        ]);
    }

    /**
     * The class the signed-in student is assigned to today (class_student), latest first.
     * Users have no class; a student account reaches its classes through its students row.
     */
    private function currentClass(User $user): ?ClassModel
    {
        $student = Student::where('user_id', $user->id)->first();
        $today = now()->toDateString();

        return $student?->classes()
            ->with('semester')
            ->where('class_student.assigned_from', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('class_student.assigned_to')
                    ->orWhere('class_student.assigned_to', '>=', $today);
            })
            ->orderByDesc('class_student.assigned_from')
            ->first();
    }

    private function formatTime($time)
    {
        if (!$time) return 'N/A';

        $hour = intval(substr($time, 0, 2));
        $minute = substr($time, 3, 2);
        $period = $hour >= 12 ? 'PM' : 'AM';
        $displayHour = $hour % 12 ?: 12;

        return str_pad($displayHour, 2, '0', STR_PAD_LEFT) . ':' . $minute . ' ' . $period;
    }
}
