<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Semester;
use App\Models\AcademicYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Tenancy\TenantRule;

class SemesterController extends Controller
{
    /**
     * Get all semesters
     */
    public function index(Request $request): JsonResponse
    {
        $semesters = Semester::query()
            ->with('academicYear')
            ->when($request->get('academic_year_id'), function ($query, $academicYearId) {
                $query->where('academic_year_id', $academicYearId);
            })
            ->when($request->get('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('semester_number')
            ->get();

        return response()->json($semesters);
    }

    /**
     * Get a single semester
     */
    public function show(Semester $semester): JsonResponse
    {
        $semester->load('academicYear');
        return response()->json($semester);
    }

    /**
     * Create a new semester
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'academic_year_id' => ['required', TenantRule::exists('academic_years', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'semester_number' => ['required', 'integer', 'min:1', 'max:16'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_active' => ['boolean'],
        ]);

        $semester = Semester::create($payload);
        $semester->load('academicYear');

        return response()->json($semester, 201);
    }

    /**
     * Update a semester
     */
    public function update(Request $request, Semester $semester): JsonResponse
    {
        $payload = $request->validate([
            'academic_year_id' => ['required', TenantRule::exists('academic_years', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'semester_number' => ['required', 'integer', 'min:1', 'max:16'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_active' => ['boolean'],
        ]);

        $semester->update($payload);
        $semester->load('academicYear');

        return response()->json($semester);
    }

    /**
     * Delete a semester
     */
    public function destroy(Semester $semester): JsonResponse
    {
        $semester->delete();
        return response()->json(['message' => 'Semester deleted successfully']);
    }

    /**
     * Get academic years for select dropdown
     */
    public function getAcademicYears(): JsonResponse
    {
        $academicYears = AcademicYear::query()
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($ay) {
                return [
                    'id' => $ay->id,
                    'year' => $ay->year,
                    'name' => $ay->year,
                    'code' => $ay->code,
                    'start_date' => $ay->start_date ? $ay->start_date->format('Y-m-d') : null,
                    'end_date' => $ay->end_date ? $ay->end_date->format('Y-m-d') : null,
                    'start_year' => $ay->start_date ? (int) $ay->start_date->format('Y') : null,
                    'end_year' => $ay->end_date ? (int) $ay->end_date->format('Y') : null,
                    'is_active' => (bool) $ay->is_active,
                ];
            });

        return response()->json($academicYears);
    }

    /**
     * Get semester options for select dropdown (1-16)
     */
    public function getSemesterOptions(): JsonResponse
    {
        $semesters = collect(range(1, 16))->map(function ($num) {
            return [
                'value' => $num,
                'label' => "Semester $num"
            ];
        });

        return response()->json($semesters);
    }
}
