<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarkScheme;
use App\Models\Subject;
use App\Models\Semester;
use Illuminate\Http\Request;

class MarkSchemeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:marks.create', ['only' => ['store', 'update', 'destroy']]);
        $this->middleware('permission:marks.view', ['only' => ['index', 'show']]);
    }

    /**
     * Get all mark schemes with filtering
     */
    public function index(Request $request)
    {
        $query = MarkScheme::with(['subject', 'semester']);

        if ($request->has('semester_id')) {
            $query->where('semester_id', $request->semester_id);
        }

        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $schemes = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $schemes,
            'message' => 'Mark schemes retrieved successfully',
        ]);
    }

    /**
     * Get a specific mark scheme
     */
    public function show(MarkScheme $scheme)
    {
        return response()->json([
            'success' => true,
            'data' => $scheme->load(['subject', 'semester']),
            'message' => 'Mark scheme retrieved successfully',
        ]);
    }

    /**
     * Create a new mark scheme
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'semester_id' => 'required|exists:semesters,id',
            'internal_marks' => 'required|integer|min:0',
            'external_marks' => 'required|integer|min:0',
            'total_marks' => 'required|integer|min:1',
            'pass_mark' => 'required|integer|min:0',
            'extra_marks_allowed' => 'integer|min:0',
            'is_active' => 'boolean',
        ]);

        // Validate total_marks = internal + external
        if ($validated['total_marks'] !== $validated['internal_marks'] + $validated['external_marks']) {
            return response()->json([
                'success' => false,
                'message' => 'Total marks must equal internal + external marks',
            ], 422);
        }

        $scheme = MarkScheme::create($validated);

        return response()->json([
            'success' => true,
            'data' => $scheme->load(['subject', 'semester']),
            'message' => 'Mark scheme created successfully',
        ], 201);
    }

    /**
     * Update a mark scheme
     */
    public function update(Request $request, MarkScheme $scheme)
    {
        $validated = $request->validate([
            'internal_marks' => 'integer|min:0',
            'external_marks' => 'integer|min:0',
            'total_marks' => 'integer|min:1',
            'pass_mark' => 'integer|min:0',
            'extra_marks_allowed' => 'integer|min:0',
            'is_active' => 'boolean',
        ]);

        // Validate total_marks
        if (isset($validated['total_marks'], $validated['internal_marks'], $validated['external_marks'])) {
            if ($validated['total_marks'] !== $validated['internal_marks'] + $validated['external_marks']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total marks must equal internal + external marks',
                ], 422);
            }
        }

        $scheme->update($validated);

        return response()->json([
            'success' => true,
            'data' => $scheme->load(['subject', 'semester']),
            'message' => 'Mark scheme updated successfully',
        ]);
    }

    /**
     * Delete a mark scheme
     */
    public function destroy(MarkScheme $scheme)
    {
        $scheme->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mark scheme deleted successfully',
        ]);
    }

    /**
     * Get subjects for a semester to configure mark scheme
     */
    public function getSubjectsBySemet(Request $request)
    {
        $validated = $request->validate([
            'semester_id' => 'required|exists:semesters,id',
        ]);

        $semester = Semester::findOrFail($validated['semester_id']);
        $subjects = $semester->subjects()->get();

        return response()->json([
            'success' => true,
            'data' => $subjects,
            'message' => 'Subjects retrieved for semester',
        ]);
    }
}
