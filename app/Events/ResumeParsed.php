<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** Stage 2: text and entities were extracted from a resume. → AnalyzeResumeJob */
class ResumeParsed implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(public readonly int $institutionId, public readonly int $resumeId)
    {
    }
}
