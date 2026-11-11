<?php

namespace App\Notifications\Placement;

use App\Notifications\CampusNotification;

/** Sent to the student when an offer passes its respond-by date unanswered. Takes plain values, not models: queued notifications run without a tenant. */
class OfferExpired extends CampusNotification
{
    public function __construct(public readonly int $applicationId, public readonly int $jobId, public readonly string $jobTitle, public readonly string $company)
    {
    }

    public function category(): string
    {
        return 'placement';
    }

    public function title(): string
    {
        return "Your offer from {$this->company} expired";
    }

    public function body(): string
    {
        return "You did not respond to the {$this->jobTitle} offer from {$this->company} by the deadline, so it has expired.";
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
