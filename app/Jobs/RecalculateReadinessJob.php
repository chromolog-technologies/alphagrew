<?php

namespace App\Jobs;

use App\Models\Student;
use App\Services\Ai\ReadinessCalculator;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Appends a readiness score to the student's history after an input changes
 * (resume analysed, interview evaluated, results published).
 */
class RecalculateReadinessJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $institutionId, public readonly int $studentId, public readonly string $trigger)
    {
    }

    public function handle(Tenant $tenant, ReadinessCalculator $readiness): void
    {
        $tenant->runAs($this->institutionId, function () use ($readiness): void {
            $student = Student::query()->find($this->studentId);

            if ($student) {
                $readiness->record($student, $this->trigger);
            }
        });
    }
}
