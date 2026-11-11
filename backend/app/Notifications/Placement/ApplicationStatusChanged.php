<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to the student when their application moves to a new status. Takes plain values, not models: queued notifications run without a tenant. */
class ApplicationStatusChanged extends CampusNotification
{
    public function __construct(public readonly int $applicationId, public readonly int $jobId, public readonly string $jobTitle, public readonly string $company, public readonly string $status, public readonly string $statusLabel, public readonly ?string $note)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "{$this->company}: {$this->statusLabel}";
    }

    public function body(): string
    {
        return "Your application for {$this->jobTitle} at {$this->company} is now: {$this->statusLabel}." . ($this->note ? " {$this->note}" : "");
    }

    public function link(): ?string
    {
        return "placement?job={$this->jobId}";
    }

    public function meta(): array
    {
        return ['applicationId' => $this->applicationId, 'jobId' => $this->jobId, 'status' => $this->status];
    }
}
