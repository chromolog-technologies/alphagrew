<?php

namespace App\Http\Resources;

use App\Models\StudentAcademicSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentAcademicSummary
 */
class AcademicSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'cgpa' => $this->cgpa,
            'activeBacklogs' => $this->active_backlogs,
            'backlogHistory' => $this->backlog_history,
            'attendancePercentage' => $this->attendance_percentage,
            'subjectsPublished' => $this->subjects_published,
            'semestersPublished' => $this->semesters_published,
            // "results" = calculated from published results; "manual" = entered by staff, not yet backed by results.
            'source' => $this->source,
            'calculatedAt' => $this->calculated_at?->toIso8601String(),
        ];
    }
}
