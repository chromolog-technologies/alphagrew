<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Api\V1\TimetableController as ClassTimetableController;
use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The signed-in student's weekly timetable.
 *
 * The class is found from the class roster (class_student) first. Students who were only
 * placed in a batch fall back to the one class linked to that batch. A student with no class
 * gets an empty timetable and a notice explaining why (200), not an error: it is a set-up
 * gap for the institution, not a failure the student can fix. Only accounts with no student
 * record get 404.
 */
class TimetableController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request): JsonResponse
    {
        $student = $this->student($request->user());
        if (! $student) {
            return $this->noStudentRecord();
        }

        [$class, $notice] = $this->resolveClass($student);
        $slots = $class ? $this->slots($class) : collect();

        $dailySchedule = [];
        foreach (ClassTimetableController::DAYS as $day) {
            $daySlots = $slots->where('day', $day)->values();
            $dailySchedule[$day] = ['classes' => $daySlots->count(), 'slots' => $daySlots];
        }

        $faculty = $slots->pluck('faculty')->filter()->unique();

        return response()->json([
            'success' => true,
            'data' => [
                'class' => $class ? $this->presentClass($class) : null,
                'notice' => $notice,
                'all_classes' => $slots->count(),
                'learning_hours_per_week' => round($slots->sum('duration_minutes') / 60, 1),
                'unique_faculty' => $faculty->count(),
                'daily_schedule' => $dailySchedule,
                'all_slots' => $slots->values(),
            ],
            'message' => $class ? 'Timetable retrieved successfully' : $notice,
        ]);
    }

    public function getByDay(Request $request): JsonResponse
    {
        $day = $request->query('day', 'Monday');
        if (! in_array($day, ClassTimetableController::DAYS, true)) {
            return response()->json(['success' => false, 'message' => 'Choose a day from Monday to Saturday.'], 422);
        }

        $student = $this->student($request->user());
        if (! $student) {
            return $this->noStudentRecord();
        }

        [$class, $notice] = $this->resolveClass($student);
        $slots = $class ? $this->slots($class)->where('day', $day)->values() : collect();

        return response()->json([
            'success' => true,
            'data' => [
                'day' => $day,
                'class' => $class ? $this->presentClass($class) : null,
                'notice' => $notice,
                'classes_count' => $slots->count(),
                'slots' => $slots->map(fn (array $slot) => [...$slot, 'time' => "{$slot['start_time']} - {$slot['end_time']}"]),
            ],
            'message' => $class ? "Timetable for $day retrieved" : $notice,
        ]);
    }

    private function student(User $user): ?Student
    {
        return Student::where('user_id', $user->id)->first();
    }

    private function noStudentRecord(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'No student record is linked to this account.',
        ], 404);
    }

    /**
     * @return array{0: ?ClassModel, 1: ?string} the class and, when there is none, why.
     */
    private function resolveClass(Student $student): array
    {
        $today = now()->toDateString();

        // 1. The class roster: the assignment that covers today, latest first.
        $rostered = $student->classes()
            ->with('semester')
            ->where('class_student.assigned_from', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('class_student.assigned_to')
                    ->orWhere('class_student.assigned_to', '>=', $today);
            })
            ->orderByDesc('class_student.assigned_from')
            ->first();
        if ($rostered) {
            return [$rostered, null];
        }

        // 2. The student's batch, when exactly one class belongs to it.
        if ($student->batch_id) {
            $batchClasses = ClassModel::query()->with('semester')->where('batch_id', $student->batch_id)->limit(2)->get();
            if ($batchClasses->count() === 1) {
                return [$batchClasses->first(), null];
            }
            if ($batchClasses->count() > 1) {
                return [null, 'Your batch has more than one class. Ask your institution to add you to your class roster to see your timetable.'];
            }
        }

        return [null, 'You have not been added to a class yet. Your timetable will appear here once your institution assigns you to one.'];
    }

    /** Active sessions for the class, Monday first and in time order. */
    private function slots(ClassModel $class): Collection
    {
        return Timetable::activeFor($class->id)
            ->with(['subject:id,name,code', 'faculty:id,name'])
            ->get()
            ->sortBy(fn (Timetable $t) => sprintf('%d %s', array_search($t->day_of_week, ClassTimetableController::DAYS, true), $t->start_time))
            ->map(fn (Timetable $slot) => [
                'id' => $slot->id,
                'course_code' => $slot->subject?->code,
                'course_name' => $slot->subject?->name,
                'faculty' => $slot->faculty?->name,
                'day' => $slot->day_of_week,
                // Display form ("09:00 AM") and 24-hour form ("09:00") for sorting and layout.
                'start_time' => $this->formatTime($slot->start_time),
                'end_time' => $this->formatTime($slot->end_time),
                'start' => substr((string) $slot->start_time, 0, 5),
                'end' => substr((string) $slot->end_time, 0, 5),
                'duration_minutes' => $this->minutesBetween($slot->start_time, $slot->end_time),
                'session_type' => $slot->session_type,
                'room' => $slot->room_number,
                'semester' => $class->semester?->name,
            ])
            ->values();
    }

    private function presentClass(ClassModel $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'code' => $class->code,
            'semester' => $class->semester?->name,
        ];
    }

    private function minutesBetween(?string $start, ?string $end): int
    {
        if (! $start || ! $end) {
            return 0;
        }
        [$sh, $sm] = array_map('intval', explode(':', $start));
        [$eh, $em] = array_map('intval', explode(':', $end));

        return max(0, ($eh * 60 + $em) - ($sh * 60 + $sm));
    }

    private function formatTime(?string $time): ?string
    {
        if (! $time) {
            return null;
        }

        $hour = intval(substr($time, 0, 2));
        $minute = substr($time, 3, 2);
        $period = $hour >= 12 ? 'PM' : 'AM';
        $displayHour = $hour % 12 ?: 12;

        return str_pad((string) $displayHour, 2, '0', STR_PAD_LEFT).':'.$minute.' '.$period;
    }
}
