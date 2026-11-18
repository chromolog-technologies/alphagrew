<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to the applicants taking part when a round is scheduled. Takes plain values, not models: queued notifications run without a tenant. */
class RoundScheduled extends CampusNotification
{
    public function __construct(public readonly int $jobId, public readonly string $jobTitle, public readonly string $company, public readonly string $roundName, public readonly ?string $scheduledAt, public readonly ?string $details)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "{$this->company}: {$this->roundName} scheduled";
    }

    public function body(): string
    {
        return "{$this->roundName} for {$this->jobTitle} at {$this->company}" . ($this->scheduledAt ? " is on {$this->scheduledAt}" : " has been added") . "." . ($this->details ? " {$this->details}" : "");
    }

    public function link(): ?string
    {
        return "placement?job={$this->jobId}";
    }

    public function meta(): array
    {
        return ['jobId' => $this->jobId];
    }
}
