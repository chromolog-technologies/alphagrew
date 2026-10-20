<?php

namespace App\Services\Academics;

use App\Enums\MarkStatus;
use App\Models\Attendance;
use App\Models\GradeRule;
use App\Models\MarkEntry;
use App\Models\SemesterResult;
use App\Models\Student;
use Illuminate\Support\Collection;

/**
 * Derives a student's CGPA, backlogs and attendance from published (locked) results
 * (Academic Results spec §5). Must run inside the student's tenant context, because
 * grade rules are per institution.
 *
 * - CGPA = Σ(grade point × credits) / Σ credits over the latest locked attempt per subject
 * - active backlogs: subjects whose latest locked attempt failed (F / absent)
 * - backlog history: subjects ever failed, even if cleared later
 */
class AcademicSummaryCalculator
{
    /**
     * @return array{cgpa: float, active_backlogs: int, backlog_history: int, subjects_published: int, semesters_published: int}|null
     *         null when the student has no published results yet.
     */
    public function results(Student $student): ?array
    {
        $entries = MarkEntry::query()
            ->with(['subject', 'markScheme'])
            ->where('student_id', $student->id)
            ->where('status', MarkStatus::Locked->value)
            ->orderBy('published_at')
            ->orderBy('id')
            ->get();

        if ($entries->isEmpty()) {
            return null;
        }

        // The latest published attempt per subject counts; earlier fails stay in the history.
        $latestBySubject = $entries->groupBy('subject_id')->map(fn (Collection $attempts) => $attempts->last());

        $weightedPoints = 0.0;
        $totalCredits = 0;

        foreach ($latestBySubject as $entry) {
            $credits = $entry->subject?->credits() ?? 1;
            $weightedPoints += $this->gradePoint($entry) * $credits;
            $totalCredits += $credits;
        }

        return [
            'cgpa' => $totalCredits > 0 ? round($weightedPoints / $totalCredits, 2) : 0.0,
            'active_backlogs' => $latestBySubject->filter(fn (MarkEntry $entry) => $entry->failed())->count(),
            'backlog_history' => $entries->filter(fn (MarkEntry $entry) => $entry->failed())->pluck('subject_id')->unique()->count(),
            'subjects_published' => $latestBySubject->count(),
            'semesters_published' => SemesterResult::query()->where('student_id', $student->id)->where('is_published', true)->count(),
        ];
    }

    /** Present ÷ recorded sessions, as a percentage; null when no attendance is recorded. */
    public function attendancePercentage(Student $student): ?float
    {
        $total = Attendance::query()->where('student_id', $student->id)->count();

        if ($total === 0) {
            return null;
        }

        $present = Attendance::query()->where('student_id', $student->id)->where('status', 'present')->count();

        return round($present / $total * 100, 2);
    }

    /** The grade point stored when the mark was graded; looked up for entries graded before it was stored. */
    private function gradePoint(MarkEntry $entry): float
    {
        if ($entry->failed()) {
            return 0.0;
        }

        if ($entry->grade_point !== null) {
            return $entry->grade_point;
        }

        $maximum = $entry->markScheme?->total_max ?: 100;
        $percentage = round((float) $entry->total_marks / $maximum * 100, 2);

        return (float) GradeRule::query()
            ->where('grade', '!=', GradeRule::ABSENT)
            ->where('min_score', '<=', $percentage)
            ->where('max_score', '>=', $percentage)
            ->value('grade_point');
    }
}
