<?php

namespace App\Http\Resources;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An application with its status, offer, history and round results. `student` (for officers)
 * and `job` (for students) appear when loaded.
 *
 * @mixin JobApplication
 */
class JobApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $student = $this->relationLoaded('student') ? $this->student : null;

        return [
            'id' => $this->id,
            'jobId' => $this->job_posting_id,
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'allowedNext' => array_map(fn ($status) => $status->value, $this->status->allowedNext()),
            'appliedAt' => $this->applied_at?->toIso8601String(),
            'decidedAt' => $this->decided_at?->toIso8601String(),
            'withdrawnAt' => $this->withdrawn_at?->toIso8601String(),
            'offer' => $this->offered_at ? [
                'ctcLpa' => $this->offer_ctc_lpa,
                'offeredAt' => $this->offered_at->toIso8601String(),
                'respondBy' => $this->offer_respond_by?->toIso8601String(),
                'respondedAt' => $this->responded_at?->toIso8601String(),
                'note' => $this->offer_note,
            ] : null,
            'eligibilitySnapshot' => $this->eligibility_snapshot,
            'student' => $student ? [
                'id' => $student->id,
                'name' => $student->name,
                'registrationNumber' => $student->registration_number,
                'departmentCode' => $student->department_code,
                'year' => $student->year,
                'cgpa' => $student->academicSummary?->cgpa ?? $student->cgpa,
                'email' => $student->email,
            ] : null,
            'job' => $this->whenLoaded('jobPosting', fn () => [
                'id' => $this->jobPosting->id,
                'title' => $this->jobPosting->title,
                'company' => $this->jobPosting->company?->name,
                'packageDisplay' => $this->jobPosting->package_display,
                'status' => $this->jobPosting->status,
            ]),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'fromStatus' => $event->from_status,
                'toStatus' => $event->to_status,
                'note' => $event->note,
                'actor' => $event->relationLoaded('actor') ? $event->actor?->name : null,
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
            'roundResults' => $this->whenLoaded('roundResults', fn () => $this->roundResults->map(fn ($result) => [
                'roundId' => $result->round_id,
                'round' => $result->round?->name,
                'status' => $result->status,
                'score' => $result->score,
                'feedback' => $result->feedback,
            ])->values()),
        ];
    }
}
