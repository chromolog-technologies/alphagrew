<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to the job's creator when a student accepts or declines an offer. Takes plain values, not models: queued notifications run without a tenant. */
class OfferResponded extends CampusNotification
{
    public function __construct(public readonly int $applicationId, public readonly int $jobId, public readonly string $jobTitle, public readonly string $company, public readonly string $studentName, public readonly string $registrationNumber, public readonly string $response)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "{$this->studentName} {$this->response} the {$this->company} offer";
    }

    public function body(): string
    {
        return "{$this->studentName} ({$this->registrationNumber}) {$this->response} the offer for {$this->jobTitle} at {$this->company}.";
    }

    public function link(): ?string
    {
        return "placement?job={$this->jobId}";
    }

    public function meta(): array
    {
        return ['applicationId' => $this->applicationId, 'jobId' => $this->jobId];
    }
}
