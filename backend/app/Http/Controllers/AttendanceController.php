<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Student;
use App\Models\Subject;
use App\Models\ClassModel;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use App\Support\Tenancy\TenantRule;

class AttendanceController extends Controller
{
    /**
     * Get attendance records with filters
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.view', 'sanctum')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Attendance::query()
            ->with(['student', 'subject', 'faculty']);

        // Faculty can only see their own subjects' attendance
        if ($user->hasRole('faculty', 'sanctum')) {
            $query->where('faculty_id', $user->id);
        }

        // Students can only see their own attendance
        if ($user->hasRole('student', 'sanctum')) {
            $student = Student::where('user_id', $user->id)->first();
            if ($student) {
                $query->where('student_id', $student->id);
            } else {
                return response()->json(['attendance' => []]);
            }
        }

        // Apply filters
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('student_id')) {
            if ($user->hasPermissionTo('attendance.view', 'sanctum')) {
                $query->where('student_id', $request->student_id);
            }
        }

        if ($request->has('from_date')) {
            $query->whereDate('attendance_date', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('attendance_date', '<=', $request->to_date);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $attendance = $query->orderBy('attendance_date', 'desc')
            ->paginate($request->get('per_page', 50));

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
     * Mark attendance for students
     */
    public function markAttendance(Request $request)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.mark', 'sanctum')) {
            return response()->json(['message' => 'You cannot mark attendance'], 403);
        }

        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'attendance_data' => 'required|array',
            'attendance_data.*.student_id' => 'required|exists:students,id',
            'attendance_data.*.status' => 'required|in:present,absent,leave,other',
            'attendance_date' => 'required|date',
            'remarks' => 'nullable|string',
        ]);

        $subject = Subject::findOrFail($validated['subject_id']);
        $errors = [];
        $created = [];

        foreach ($validated['attendance_data'] as $record) {
            try {
                // Check if attendance already exists for this date
                $existing = Attendance::where('student_id', $record['student_id'])
                    ->where('subject_id', $validated['subject_id'])
                    ->whereDate('attendance_date', $validated['attendance_date'])
                    ->first();

                if ($existing) {
                    // Update existing record
                    $existing->update([
                        'status' => $record['status'],
                        'remarks' => $validated['remarks'] ?? $existing->remarks,
                    ]);
                    $created[] = $existing;
                } else {
                    // Create new record
                    $attendance = Attendance::create([
                        'student_id' => $record['student_id'],
                        'subject_id' => $validated['subject_id'],
                        'faculty_id' => $user->id,
                        'attendance_date' => $validated['attendance_date'],
                        'status' => $record['status'],
                        'remarks' => $validated['remarks'],
                    ]);
                    $created[] = $attendance;
                }
            } catch (\Exception $e) {
                $errors[] = [
                    'student_id' => $record['student_id'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => 'Attendance marked successfully',
            'created' => count($created),
            'errors' => $errors,
            'attendance' => $created,
        ]);
    }

    /**
     * Get students for a specific subject (for marking attendance)
     */
    public function getStudentsForSubject(Request $request, $subjectId)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.mark', 'sanctum')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $subject = Subject::findOrFail($subjectId);

        // Get all classes that have this subject in current semester
        $classes = ClassModel::where('subject_id', $subjectId)
            ->orWhereHas('semester', function (Builder $query) {
                $query->where('is_active', true);
            })
            ->get();

        // Get students in those classes
        $students = Student::whereHas('classes', function (Builder $query) use ($classes) {
            $query->whereIn('classes.id', $classes->pluck('id'));
        })
        ->with('user')
        ->get()
        ->map(function ($student) {
            return [
                'id' => $student->id,
                'roll_number' => $student->roll_number,
                'name' => $student->user->name,
                'email' => $student->user->email,
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
    public function getStudentReport(Request $request, $studentId)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.view', 'sanctum')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $student = Student::findOrFail($studentId);

        // Students can only view their own report
        if ($user->hasRole('student', 'sanctum') && Student::where('user_id', $user->id)->first()?->id !== $studentId) {
            return response()->json(['message' => 'You can only view your own attendance'], 403);
        }

        $query = Attendance::where('student_id', $studentId)
            ->with(['subject', 'faculty']);

        // Apply semester filter if provided
        if ($request->has('semester_id')) {
            $subjectIds = Subject::where('semester_number', $request->semester_id)
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
                'name' => $student->user->name,
                'roll_number' => $student->roll_number,
                'email' => $student->user->email,
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
    public function getSubjectReport(Request $request, $subjectId)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.view', 'sanctum')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $subject = Subject::findOrFail($subjectId);

        $query = Attendance::where('subject_id', $subjectId)
            ->with(['student', 'faculty']);

        // Filter by date range if provided
        if ($request->has('from_date')) {
            $query->whereDate('attendance_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('attendance_date', '<=', $request->to_date);
        }

        $attendance = $query->get();

        // Student-wise summary
        $studentSummary = $attendance->groupBy('student_id')->map(function ($records) {
            $total = $records->count();
            $present = $records->where('status', 'present')->count();
            $percentage = $total > 0 ? round(($present / $total) * 100, 2) : 0;

            return [
                'student' => $records->first()->student->user->name,
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
    public function update(Request $request, $attendanceId)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.edit', 'sanctum')) {
            return response()->json(['message' => 'You cannot edit attendance'], 403);
        }

        $attendance = Attendance::findOrFail($attendanceId);

        // Faculty can only edit their own marked attendance
        if ($user->hasRole('faculty', 'sanctum') && $attendance->faculty_id !== $user->id) {
            return response()->json(['message' => 'You can only edit attendance you marked'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:present,absent,leave,other',
            'remarks' => 'nullable|string',
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
    public function delete(Request $request, $attendanceId)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.delete', 'sanctum')) {
            return response()->json(['message' => 'You cannot delete attendance'], 403);
        }

        $attendance = Attendance::findOrFail($attendanceId);
        $attendance->delete();

        return response()->json(['message' => 'Attendance deleted successfully']);
    }

    /**
     * Approve attendance (HOD/Admin only)
     */
    public function approveAttendance(Request $request)
    {
        $user = $request->user();
        
        // Check permission
        if (!$user->hasPermissionTo('attendance.approve', 'sanctum')) {
            return response()->json(['message' => 'You cannot approve attendance'], 403);
        }

        $validated = $request->validate([
            'attendance_ids' => 'required|array|min:1',
            'attendance_ids.*' => TenantRule::exists('attendance', 'id'),
        ]);

        Attendance::whereIn('id', $validated['attendance_ids'])
            ->update(['is_approved' => true]);

        return response()->json([
            'message' => 'Attendance approved successfully',
            'count' => count($validated['attendance_ids']),
        ]);
    }
}
