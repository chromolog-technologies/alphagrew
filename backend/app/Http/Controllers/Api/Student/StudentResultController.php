<?php

namespace App\Http\Controllers\Api\Student;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\Enums\MarkStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Resources\AcademicSummaryResource;
use App\Http\Resources\SemesterGradeCardResource;
use App\Models\MarkEntry;
use App\Models\Semester;
use App\Models\SemesterResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * A student's own published results (Academic Results spec §4 Stage 6).
 * Only published semesters are visible; everything else is still under review.
 */
class StudentResultController extends Controller
{
    /** GET /student/results/semesters */
    public function semesters(OwnStudentRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->publishedSemesters($request)]);
    }

    /** GET /student/results/semester/{semester} — the grade card; 404 until published. */
    public function semester(OwnStudentRequest $request, Semester $semester): SemesterGradeCardResource
    {
        $student = $request->student();
        $result = SemesterResult::query()
            ->with('semester.academicYear')
            ->where('student_id', $student->id)
            ->where('semester_id', $semester->id)
            ->where('is_published', true)
            ->firstOrFail();

        $entries = MarkEntry::query()
            ->with('subject')
            ->inSemester($semester->id)
            ->where('student_id', $student->id)
            ->where('status', MarkStatus::Locked->value)
            ->orderBy('id')
            ->get()
            ->keyBy('subject_id') // latest attempt per subject
            ->sortBy(fn (MarkEntry $entry) => $entry->subject->code);

        return new SemesterGradeCardResource($result, $entries);
    }

    /** GET /student/results/all — every published semester plus the derived CGPA and backlogs. */
    public function all(OwnStudentRequest $request, RecalculateAcademicSummaryAction $recalculate): JsonResponse
    {
        $student = $request->student();

        return response()->json([
            'data' => [
                'semesters' => $this->publishedSemesters($request),
                'summary' => new AcademicSummaryResource($student->academicSummary ?? $recalculate->execute($student)),
            ],
        ]);
    }

    /** @return Collection<int, array<string, mixed>> in semester order */
    private function publishedSemesters(OwnStudentRequest $request): Collection
    {
        return SemesterResult::query()
            ->with('semester.academicYear')
            ->where('student_id', $request->student()->id)
            ->where('is_published', true)
            ->get()
            ->sortBy(fn (SemesterResult $result) => [$result->semester->semester_number, $result->semester_id])
            ->map(fn (SemesterResult $result) => [
                'id' => $result->semester->id,
                'name' => $result->semester->name,
                'academicYear' => $result->semester->academicYear?->year,
                'sgpa' => $result->sgpa,
                'totalCredits' => $result->total_credits,
                'creditsEarned' => $result->credits_earned,
                'resultStatus' => $result->result,
                'publishedAt' => $result->published_at?->toIso8601String(),
            ])
            ->values();
    }
}
