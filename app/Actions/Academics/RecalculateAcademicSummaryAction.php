<?php

namespace App\Actions\Academics;

use App\Models\Student;
use App\Models\StudentAcademicSummary;
use App\Services\Academics\AcademicSummaryCalculator;

/**
 * Refreshes a student's academic summary. With published results the figures are
 * derived (source = results); without, the hand-entered students.cgpa is kept
 * (source = manual). Attendance comes from attendance records when any exist.
 */
class RecalculateAcademicSummaryAction
{
    public function __construct(private readonly AcademicSummaryCalculator $calculator)
    {
    }

    public function execute(Student $student): StudentAcademicSummary
    {
        $results = $this->calculator->results($student);
        $attendance = $this->calculator->attendancePercentage($student);

        $attributes = $results
            ? [...$results, 'source' => StudentAcademicSummary::SOURCE_RESULTS]
            : [
                'cgpa' => $student->cgpa,
                'active_backlogs' => 0,
                'backlog_history' => 0,
                'subjects_published' => 0,
                'semesters_published' => 0,
                'source' => StudentAcademicSummary::SOURCE_MANUAL,
            ];

        $summary = StudentAcademicSummary::query()->updateOrCreate(
            ['student_id' => $student->id],
            [
                ...$attributes,
                'institution_id' => $student->institution_id,
                'attendance_percentage' => $attendance ?? $student->attendance,
                'calculated_at' => now(),
            ],
        );

        $student->setRelation('academicSummary', $summary);

        return $summary;
    }
}
