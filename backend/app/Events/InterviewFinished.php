<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** Stage 10 → 11: an interview ended with answers to evaluate. → EvaluateInterviewJob */
class InterviewFinished implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(public readonly int $institutionId, public readonly int $interviewId)
    {
    }
}
