<?php

namespace App\Listeners;

use App\Events\StudentResultsChanged;
use App\Jobs\RecalculateAcademicSummary;

/**
 * One queued recalculation per affected student, so publishing a large semester stays fast.
 */
class QueueAcademicSummaryRecalculation
{
    public function handle(StudentResultsChanged $event): void
    {
        foreach (array_unique($event->studentIds) as $studentId) {
            RecalculateAcademicSummary::dispatch($event->institutionId, (int) $studentId);
        }
    }
}
