<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** A resume's ATS analysis was stored; the resume component of readiness may change. */
class ResumeAnalyzed implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(public readonly int $institutionId, public readonly int $studentId, public readonly int $resumeId)
    {
    }
}
