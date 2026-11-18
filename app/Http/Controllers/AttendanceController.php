<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\TenantRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Who sees which attendance records:
 * - students: only their own;
 * - staff: only records they marked, unless they may approve attendance (HOD);
 * - admins: every record in the institution (the tenant scope still applies).
 */
class AttendanceController extends Controller
{
    private const MAX_PER_PAGE = 100;

    /**
     * Get attendance records with filters
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $filters = $request->validate([
            'subject_id' => 'sometimes|integer',
            'student_id' => 'sometimes|integer',
            'from_date' => 'sometimes|date',
            'to_date' => 'sometimes|date',
            'status' => 'sometimes|in:present,absent,leave,other',
            'per_page' => 'sometimes|integer|min:1|max:'.self::MAX_PER_PAGE,
        ]);

        $query = Attendance::query()
            ->with(['student', 'subject', 'faculty']);

        if ($user->roleEnum() === UserRole::Student) {
            $studentId = $this->ownStudentId($user);
            if ($studentId === null) {
                return response()->json(['attendance' => []]);
            }
            $query->where('student_id', $studentId);
        } elseif (isset($filters['student_id'])) {
            $query->where('student_id', $filters['student_id']);
        }

        $this->limitToOwnMarking($query, $user);

        if (isset($filters['subject_id'])) {
            $query->where('subject_id', $filters['subject_id']);
        }

        if (isset($filters['from_date'])) {
            $query->whereDate('attendance_date', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->whereDate('attendance_date', '<=', $filters['to_date']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $attendance = $query->orderBy('attendance_date', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 50));

        return response()->json([
            'attendance' => $attendance->items(),
            'pagination' => [
                'total' => $attendance->total(),
                'per_page' => $attendance->perPage(),
                'current_page' => $attendance->currentPage(),
                'last_page' => $attendance->lastPage(),
            ],
        ]);
    }

    /**
     * Mark attendance for students on the subject's roster.
     */
    public function markAttendance(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'subject_id' => ['required', 'integer', TenantRule::exists('subjects', 'id')],
            'attendance_data' => 'required|array|min:1',
            'attendance_data.*.student_id' => ['required', 'integer', 'distinct', TenantRule::exists('students', 'id')],
            'attendance_data.*.status' => 'required|in:present,absent,leave,other',
            'attendance_date' => 'required|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $subject = Subject::findOrFail($validated['subject_id']);
        $roster = $this->rosterQuery($subject)->pluck('students.id')->flip();
        $errors = [];
        $created = [];

        DB::transaction(function () use ($validated, $user, $roster, &$errors, &$created): void {
            foreach ($validated['attendance_data'] as $record) {
                $studentId = (int) $record['student_id'];

                if (! $roster->has($studentId)) {
                    $errors[] = ['student_id' => $studentId, 'error' => 'The student is not enrolled for this subject.'];

                    continue;
                }

                $existing = Attendance::where('student_id', $studentId)
                    ->where('subject_id', $validated['subject_id'])
                    ->whereDate('attendance_date', $validated['attendance_date'])
                    ->first();

                if ($existing) {
                    if ($this->marksOnlyOwn($user) && $existing->faculty_id !== $user->id) {
                        $errors[] = ['student_id' => $studentId, 'error' => 'Attendance was already marked by another staff member.'];

                        continue;
                    }

                    $existing->update([
                        'status' => $record['status'],
                        'remarks' => $validated['remarks'] ?? $existing->remarks,
                    ]);
                    $created[] = $existing;
                } else {
                    $created[] = Attendance::create([
                        'student_id' => $studentId,
                        'subject_id' => $validated['subject_id'],
                        'faculty_id' => $user->id,
                        'attendance_date' => $validated['attendance_date'],
                        'status' => $record['status'],
                        'remarks' => $validated['remarks'] ?? null,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Attendance marked successfully',
            'created' => count($created),
            'errors' => $errors,
            'attendance' => $created,
        ]);
    }

    /**
     * Subjects the signed-in user may mark attendance for.
     * Staff do not have the departments permission that guards GET /subjects.
     */
    public function subjects(Request $request)
    {
        $subjects = Subject::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['subjects' => $subjects]);
    }

    /**
     * Get students for a specific subject (for marking attendance)
     */
    public function getStudentsForSubject(Request $request, int $subjectId)
    {
        $subject = Subject::findOrFail($subjectId);

        $students = $this->rosterQuery($subject)
            ->with('user')
            ->orderBy('registration_number')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'roll_number' => $student->registration_number,
                    'name' => $student->user?->name ?? $student->name,
                    'email' => $student->user?->email ?? $student->email,
                ];
            });

        return response()->json([
            'subject' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ],
            'students' => $students,
        ]);
    }

    /**
     * Get attendance report for a student
     */
    public function getStudentReport(Request $request, int $studentId)
    {
        $user = $request->user();

        $student = Student::with('user')->findOrFail($studentId);

        if ($user->roleEnum() === UserRole::Student && $this->ownStudentId($user) !== $student->id) {
            return response()->json(['message' => 'You can only view your own attendance'], 403);
        }

        $query = Attendance::where('student_id', $student->id)
            ->with(['subject', 'faculty']);

        $this->limitToOwnMarking($query, $user);

        // Apply semester filter if provided
        if ($request->has('semester_id')) {
            $subjectIds = Subject::where('semester_number', (int) $request->query('semester_id'))
                ->pluck('id');
            $query->whereIn('subject_id', $subjectIds);
        }

        $attendance = $query->orderBy('attendance_date', 'desc')
            ->get();

        // Calculate attendance percentage by subject
        $bySubject = $attendance->groupBy('subject_id')->map(function ($records) {
            $total = $records->count();
            $present = $records->where('status', 'present')->count();
            $percentage = $total > 0 ? round(($present / $total) * 100, 2) : 0;

            return [
                'subject' => $records->first()->subject,
                'total_classes' => $total,
                'present' => $present,
                'absent' => $records->where('status', 'absent')->count(),
                'leave' => $records->where('status', 'leave')->count(),
                'percentage' => $percentage,
                'status' => $percentage >= 75 ? 'Satisfactory' : 'Low',
            ];
        });

        // Calculate overall attendance
        $totalClasses = $attendance->count();
        $totalPresent = $attendance->where('status', 'present')->count();
        $overallPercentage = $totalClasses > 0 ? round(($totalPresent / $totalClasses) * 100, 2) : 0;

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->user?->name ?? $student->name,
                'roll_number' => $student->registration_number,
                'email' => $student->user?->email ?? $student->email,
            ],
            'overall' => [
                'total_classes' => $totalClasses,
                'present' => $totalPresent,
                'absent' => $attendance->where('status', 'absent')->count(),
                'leave' => $attendance->where('status', 'leave')->count(),
                'percentage' => $overallPercentage,
                'status' => $overallPercentage >= 75 ? 'Satisfactory' : 'Low',
            ],
            'by_subject' => $bySubject->values(),
            'records' => $attendance,
        ]);
    }

    /**
     * Get attendance report for a subject
     */
    public function getSubjectReport(Request $request, int $subjectId)
    {
        $user = $request->user();

        $filters = $request->validate([
            'from_date' => 'sometimes|date',
            'to_date' => 'sometimes|date',
        ]);

        $subject = Subject::findOrFail($subjectId);

        $query = Attendance::where('subject_id', $subject->id)
            ->with(['student.user', 'faculty']);

        if ($user->roleEnum() === UserRole::Student) {
            $query->where('student_id', $this->ownStudentId($user) ?? 0);
        }

        $this->limitToOwnMarking($query, $user);

        if (isset($filters['from_date'])) {
            $query->whereDate('attendance_date', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->whereDate('attendance_date', '<=', $filters['to_date']);
        }

        $attendance = $query->get();

        // Student-wise summary
        $studentSummary = $attendance->groupBy('student_id')->map(function ($records) {
            $total = $records->count();
            $present = $records->where('status', 'present')->count();
            $percentage = $total > 0 ? round(($present / $total) * 100, 2) : 0;
            $student = $records->first()->student;

            return [
                'student' => $student?->user?->name ?? $student?->name,
                'total_classes' => $total,
                'present' => $present,
                'absent' => $records->where('status', 'absent')->count(),
                'leave' => $records->where('status', 'leave')->count(),
                'percentage' => $percentage,
            ];
        });

        return response()->json([
            'subject' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ],
            'summary' => $studentSummary->values(),
            'records' => $attendance,
        ]);
    }

    /**
     * Update single attendance record
     */
    public function update(Request $request, int $attendanceId)
    {
        $user = $request->user();

        $attendance = Attendance::findOrFail($attendanceId);

        if ($this->marksOnlyOwn($user) && $attendance->faculty_id !== $user->id) {
            return response()->json(['message' => 'You can only edit attendance you marked'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:present,absent,leave,other',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $attendance->update($validated);

        return response()->json([
            'message' => 'Attendance updated successfully',
            'attendance' => $attendance->load(['student', 'subject', 'faculty']),
        ]);
    }

    /**
     * Delete attendance record
     */
    public function delete(Request $request, int $attendanceId)
    {
        $user = $request->user();

        $attendance = Attendance::findOrFail($attendanceId);

        if ($this->marksOnlyOwn($user) && $attendance->faculty_id !== $user->id) {
            return response()->json(['message' => 'You can only delete attendance you marked'], 403);
        }

        $attendance->delete();

        return response()->json(['message' => 'Attendance deleted successfully']);
    }

    /**
     * Approve attendance (HOD/Admin only)
     */
    public function approveAttendance(Request $request)
    {
        $validated = $request->validate([
            'attendance_ids' => 'required|array|min:1',
            'attendance_ids.*' => ['integer', TenantRule::exists('attendance', 'id')],
        ]);

        Attendance::whereIn('id', $validated['attendance_ids'])
            ->update(['is_approved' => true]);

        return response()->json([
            'message' => 'Attendance approved successfully',
            'count' => count($validated['attendance_ids']),
        ]);
    }

    /**
     * Classes have no subject_id. A subject belongs to a course and a semester number;
     * the roster is the students in that course's classes for the same semester.
     */
    private function rosterQuery(Subject $subject): Builder
    {
        $classIds = ClassModel::query()
            ->where('course_id', $subject->course_id)
            ->whereHas('semester', function (Builder $query) use ($subject) {
                $query->where('semester_number', $subject->semester_number);
            })
            ->pluck('id');

        return Student::query()
            ->whereHas('classes', function (Builder $query) use ($classIds) {
                $query->whereIn('classes.id', $classIds);
            });
    }

    /** Staff without the approve permission work only with records they marked. */
    private function marksOnlyOwn(User $user): bool
    {
        return $user->roleEnum() === UserRole::Staff
            && ! $user->hasPermissionTo(CampusPermission::ATTENDANCE_APPROVE, 'sanctum');
    }

    private function limitToOwnMarking(Builder $query, User $user): void
    {
        if ($this->marksOnlyOwn($user)) {
            $query->where('faculty_id', $user->id);
        }
    }

    private function ownStudentId(User $user): ?int
    {
        return Student::where('user_id', $user->id)->value('id');
    }
}
