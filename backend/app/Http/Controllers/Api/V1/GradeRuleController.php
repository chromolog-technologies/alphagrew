<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GradeRule;
use Illuminate\Http\Request;

class GradeRuleController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:marks.create', ['only' => ['store', 'update', 'destroy', 'setupDefaults']]);
        $this->middleware('permission:marks.view', ['only' => ['index', 'show']]);
    }

    /**
     * Get all grade rules
     */
    public function index()
    {
        $rules = GradeRule::orderBy('sort_order')
            ->orderByDesc('min_score')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rules,
            'message' => 'Grade rules retrieved successfully',
        ]);
    }

    /**
     * Get a specific grade rule
     */
    public function show(GradeRule $rule)
    {
        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Grade rule retrieved successfully',
        ]);
    }

    /**
     * Create a new grade rule
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'min_score' => 'required|integer|min:0|max:100',
            'max_score' => 'required|integer|min:0|max:100|gte:min_score',
            'grade' => 'required|string|max:3',
            'gpa' => 'required|numeric|min:0|max:4',
            'description' => 'nullable|string',
            'sort_order' => 'integer',
        ]);

        // Check for overlap
        $overlap = GradeRule::where(function ($q) use ($validated) {
            $q->whereBetween('min_score', [$validated['min_score'], $validated['max_score']])
                ->orWhereBetween('max_score', [$validated['min_score'], $validated['max_score']]);
        })->exists();

        if ($overlap) {
            return response()->json([
                'success' => false,
                'message' => 'Grade range overlaps with existing rule',
            ], 422);
        }

        $rule = GradeRule::create($validated);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Grade rule created successfully',
        ], 201);
    }

    /**
     * Update a grade rule
     */
    public function update(Request $request, GradeRule $rule)
    {
        $validated = $request->validate([
            'min_score' => 'integer|min:0|max:100',
            'max_score' => 'integer|min:0|max:100',
            'grade' => 'string|max:3',
            'gpa' => 'numeric|min:0|max:4',
            'description' => 'nullable|string',
            'sort_order' => 'integer',
        ]);

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Grade rule updated successfully',
        ]);
    }

    /**
     * Delete a grade rule
     */
    public function destroy(GradeRule $rule)
    {
        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Grade rule deleted successfully',
        ]);
    }

    /**
     * Setup default grade rules (A+, A, B, etc.)
     */
    public function setupDefaults()
    {
        // Clear this institution's rules. truncate() would ignore the institution scope and empty the
        // table for every institution; force-delete so the per-institution unique score bands are free.
        GradeRule::withTrashed()->get()->each->forceDelete();

        $defaults = [
            ['min_score' => 90, 'max_score' => 100, 'grade' => 'A+', 'gpa' => 4.0, 'sort_order' => 1],
            ['min_score' => 80, 'max_score' => 89, 'grade' => 'A', 'gpa' => 3.7, 'sort_order' => 2],
            ['min_score' => 70, 'max_score' => 79, 'grade' => 'B+', 'gpa' => 3.3, 'sort_order' => 3],
            ['min_score' => 60, 'max_score' => 69, 'grade' => 'B', 'gpa' => 3.0, 'sort_order' => 4],
            ['min_score' => 50, 'max_score' => 59, 'grade' => 'C', 'gpa' => 2.0, 'sort_order' => 5],
            ['min_score' => 40, 'max_score' => 49, 'grade' => 'D', 'gpa' => 1.0, 'sort_order' => 6],
            ['min_score' => 0, 'max_score' => 39, 'grade' => 'F', 'gpa' => 0.0, 'sort_order' => 7],
        ];

        foreach ($defaults as $rule) {
            GradeRule::create($rule);
        }

        return response()->json([
            'success' => true,
            'data' => GradeRule::getAllSorted(),
            'message' => 'Default grade rules set up successfully',
        ]);
    }
}
