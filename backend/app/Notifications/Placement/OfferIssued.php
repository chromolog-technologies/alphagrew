<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to the student when an offer is made. Takes plain values, not models: queued notifications run without a tenant. */
class OfferIssued extends CampusNotification
{
    public function __construct(public readonly int $applicationId, public readonly int $jobId, public readonly string $jobTitle, public readonly string $company, public readonly ?string $ctcLpa, public readonly string $respondBy)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "Offer from {$this->company}";
    }

    public function body(): string
    {
        return "{$this->company} has offered you {$this->jobTitle}" . ($this->ctcLpa !== null ? " at {$this->ctcLpa} LPA" : "") . ". Respond by {$this->respondBy}, or the offer expires.";
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
