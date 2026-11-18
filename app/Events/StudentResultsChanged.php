<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Published results changed for these students (results published, unlocked, or a
 * revaluation completed). Their academic summaries must be recalculated.
 * Dispatched only once the surrounding transaction commits.
 */
class StudentResultsChanged implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    /**
     * @param  list<int>  $studentIds
     */
    public function __construct(
        public readonly int $institutionId,
        public readonly array $studentIds,
        public readonly string $reason,
    ) {
    }
}
