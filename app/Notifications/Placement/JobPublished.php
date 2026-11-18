<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to every eligible student when a job is published. Takes plain values, not models: queued notifications run without a tenant. */
class JobPublished extends CampusNotification
{
    public function __construct(public readonly int $jobId, public readonly string $jobTitle, public readonly string $company, public readonly ?string $deadline)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "A new job you are eligible for: {$this->jobTitle} at {$this->company}";
    }

    public function body(): string
    {
        return "{$this->company} is hiring for {$this->jobTitle}." . ($this->deadline ? " Apply by {$this->deadline}." : "");
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
