<?php

namespace App\Http\Resources;

use App\Models\MarkEntry;
use App\Models\SemesterResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * A student's grade card for one published semester (spec §4 Stage 6).
 *
 * @mixin SemesterResult
 */
class SemesterGradeCardResource extends JsonResource
{
    /**
     * @param  Collection<int, MarkEntry>  $entries  the semester's locked entries
     */
    public function __construct(SemesterResult $result, private readonly Collection $entries)
    {
        parent::__construct($result);
    }

    public function toArray(Request $request): array
    {
        return [
            'semester' => [
                'id' => $this->semester->id,
                'name' => $this->semester->name,
                'academicYear' => $this->semester->academicYear?->year,
            ],
            'sgpa' => $this->sgpa,
            'totalCredits' => $this->total_credits,
            'creditsEarned' => $this->credits_earned,
            'resultStatus' => $this->result,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'subjects' => $this->entries->map(fn (MarkEntry $entry) => [
                'code' => $entry->subject->code,
                'name' => $entry->subject->name,
                'credits' => $entry->subject->credits(),
                'internalMarks' => $entry->internal_marks,
                'externalMarks' => $entry->external_marks,
                'extraMarks' => $entry->extra_marks,
                'totalMarks' => $entry->total_marks,
                'grade' => $entry->grade,
                'gradePoint' => $entry->grade_point,
                'status' => $entry->failed() ? MarkEntry::RESULT_FAIL : MarkEntry::RESULT_PASS,
            ])->values(),
        ];
    }
}
