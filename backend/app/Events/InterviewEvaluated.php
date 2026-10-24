<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** Stage 11: the evaluation was stored. → GenerateSkillGapReportJob, RecalculateReadinessJob */
class InterviewEvaluated implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(public readonly int $institutionId, public readonly int $studentId, public readonly int $interviewId)
    {
    }
}
