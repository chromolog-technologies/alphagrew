<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarkEntry;
use App\Models\MarkScheme;
use App\Models\Exam;
use App\Models\Student;
use App\Models\ClassModel;
use Illuminate\Http\Request;

class MarkEntryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:marks.create', ['only' => ['store', 'saveDraft', 'submit']]);
        $this->middleware('permission:marks.view', ['only' => ['index', 'show', 'getStudentsForEntry']]);
    }

    /**
     * Get all mark entries with filtering
     */
    public function index(Request $request)
    {
        $query = MarkEntry::with(['exam', 'student', 'subject']);

        if ($request->has('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $entries = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $entries,
            'message' => 'Mark entries retrieved successfully',
        ]);
    }

    /**
     * Get a specific mark entry
     */
    public function show(MarkEntry $entry)
    {
        return response()->json([
            'success' => true,
            'data' => $entry->load(['exam', 'student', 'subject', 'markScheme']),
            'message' => 'Mark entry retrieved successfully',
        ]);
    }

    /**
     * Get students list for a course/semester/subject/exam to enter marks
     */
    public function getStudentsForEntry(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'subject_id' => 'required|exists:subjects,id',
        ]);

        $exam = Exam::findOrFail($validated['exam_id']);
        $semesterId = $exam->semester_id;

        // Get students for this semester
        $students = Student::whereHas('user', function ($q) {
            $q->where('role', 'student');
        })->get();

        // Get mark scheme for this subject/semester
        $markScheme = MarkScheme::where('subject_id', $validated['subject_id'])
            ->where('semester_id', $semesterId)
            ->first();

        if (!$markScheme) {
            return response()->json([
                'success' => false,
                'message' => 'Mark scheme not configured for this subject',
            ], 422);
        }

        // Format response
        $studentsData = $students->map(function ($student) use ($markScheme, $validated) {
            $existingEntry = MarkEntry::where('exam_id', $validated['exam_id'])
                ->where('student_id', $student->id)
                ->where('subject_id', $validated['subject_id'])
                ->first();

            return [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'registration_number' => $student->registration_number,
                'entry_id' => $existingEntry?->id,
                'internal_marks' => $existingEntry?->internal_marks,
                'external_marks' => $existingEntry?->external_marks,
                'extra_marks' => $existingEntry?->extra_marks,
                'is_absent' => $existingEntry?->is_absent ?? false,
                'status' => $existingEntry?->status ?? 'new',
                'total_marks' => $existingEntry?->total_marks,
                'grade' => $existingEntry?->grade,
                'result' => $existingEntry?->result,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'mark_scheme' => $markScheme,
                'students' => $studentsData,
                'exam' => $exam->load('subject'),
            ],
            'message' => 'Students and mark scheme retrieved successfully',
        ]);
    }

    /**
     * Save marks as draft (teacher can edit later)
     */
    public function saveDraft(Request $request)
    {
        $validated = $request->validate([
            'marks' => 'required|array',
            'marks.*.student_id' => 'required|exists:students,id',
            'marks.*.exam_id' => 'required|exists:exams,id',
            'marks.*.subject_id' => 'required|exists:subjects,id',
            'marks.*.mark_scheme_id' => 'required|exists:mark_schemes,id',
            'marks.*.internal_marks' => 'nullable|numeric|min:0',
            'marks.*.external_marks' => 'nullable|numeric|min:0',
            'marks.*.extra_marks' => 'nullable|numeric|min:0',
            'marks.*.is_absent' => 'boolean',
            'remarks' => 'nullable|string',
        ]);

        $user = auth()->user();
        $savedCount = 0;
        $entries = [];

        foreach ($validated['marks'] as $markData) {
            $entry = MarkEntry::updateOrCreate(
                [
                    'exam_id' => $markData['exam_id'],
                    'student_id' => $markData['student_id'],
                    'subject_id' => $markData['subject_id'],
                ],
                [
                    'mark_scheme_id' => $markData['mark_scheme_id'],
                    'internal_marks' => $markData['internal_marks'] ?? null,
                    'external_marks' => $markData['external_marks'] ?? null,
                    'extra_marks' => $markData['extra_marks'] ?? 0,
                    'is_absent' => $markData['is_absent'] ?? false,
                    'status' => 'draft',
                    'entered_by' => $user->id,
                    'remarks' => $validated['remarks'] ?? null,
                ]
            );

            // Calculate total and grade
            $entry->calculateTotalAndGrade();
            $entry->save();

            $entries[] = $entry;
            $savedCount++;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'saved_count' => $savedCount,
                'entries' => $entries,
            ],
            'message' => 'Marks saved as draft successfully',
        ]);
    }

    /**
     * Submit marks for verification (status changes from draft to submitted)
     */
    public function submitMarks(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'subject_id' => 'required|exists:subjects,id',
        ]);

        $entries = MarkEntry::where('exam_id', $validated['exam_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('status', 'draft')
            ->update(['status' => 'submitted']);

        return response()->json([
            'success' => true,
            'data' => [
                'submitted_count' => $entries,
            ],
            'message' => 'Marks submitted for verification',
        ]);
    }

    /**
     * Create or update a single mark entry
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'required|exists:subjects,id',
            'mark_scheme_id' => 'required|exists:mark_schemes,id',
            'internal_marks' => 'nullable|numeric|min:0',
            'external_marks' => 'nullable|numeric|min:0',
            'extra_marks' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string',
        ]);

        $user = auth()->user();

        $entry = MarkEntry::updateOrCreate(
            [
                'exam_id' => $validated['exam_id'],
                'student_id' => $validated['student_id'],
                'subject_id' => $validated['subject_id'],
            ],
            [
                'mark_scheme_id' => $validated['mark_scheme_id'],
                'internal_marks' => $validated['internal_marks'] ?? null,
                'external_marks' => $validated['external_marks'] ?? null,
                'extra_marks' => $validated['extra_marks'] ?? 0,
                'is_absent' => $validated['is_absent'] ?? false,
                'status' => 'draft',
                'entered_by' => $user->id,
                'remarks' => $validated['remarks'] ?? null,
            ]
        );

        // Calculate total and grade
        $entry->calculateTotalAndGrade();
        $entry->save();

        return response()->json([
            'success' => true,
            'data' => $entry->load(['exam', 'student', 'subject', 'markScheme']),
            'message' => 'Mark entry saved successfully',
        ], 201);
    }
}
