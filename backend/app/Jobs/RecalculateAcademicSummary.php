<?php

namespace App\Jobs;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\Models\Student;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Recalculates one student's CGPA / backlogs / attendance after results change.
 * Carries the institution id and restores it, since queued jobs have no request tenant.
 */
class RecalculateAcademicSummary implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    /** Collapse duplicate requests for the same student while one is pending. */
    public int $uniqueFor = 60;

    public function __construct(public readonly int $institutionId, public readonly int $studentId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->studentId;
    }

    public function handle(Tenant $tenant, RecalculateAcademicSummaryAction $recalculate): void
    {
        $tenant->runAs($this->institutionId, function () use ($recalculate): void {
            $student = Student::query()->find($this->studentId);

            if ($student) {
                $recalculate->execute($student);
            }
        });
    }
}
